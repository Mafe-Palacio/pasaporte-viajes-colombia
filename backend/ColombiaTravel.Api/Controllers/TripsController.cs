using ColombiaTravel.Api.Data;
using ColombiaTravel.Api.Dtos;
using ColombiaTravel.Api.Models;
using ColombiaTravel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColombiaTravel.Api.Controllers;

[Route("api/trips")]
[Authorize]
public class TripsController : ApiControllerBase
{
    private const long MaxPhotoBytes = 8 * 1024 * 1024; // 8 MB

    private readonly AppDbContext _db;
    private readonly IPhotoStorage _photos;

    public TripsController(AppDbContext db, IPhotoStorage photos)
    {
        _db = db;
        _photos = photos;
    }

    // Todas las consultas parten de aquí: así es imposible leer viajes de otro usuario.
    private IQueryable<TripEntry> MyTrips() => _db.TripEntries.Where(t => t.UserId == CurrentUserId);

    private async Task<TripDto?> GetDtoAsync(Guid id, CancellationToken ct) =>
        Sign(await MyTrips().AsNoTracking().Where(t => t.Id == id).Select(TripDto.FromEntity).FirstOrDefaultAsync(ct));

    // En la BD guardamos la "llave" de la foto; aquí la convertimos en una URL abrible (firmada si es Neon).
    private TripDto? Sign(TripDto? trip)
    {
        if (trip is null) return null;
        trip.Photos = trip.Photos.Select(p => p with { Url = _photos.GetUrl(p.Url) }).ToList();
        return trip;
    }

    [HttpGet]
    public async Task<ActionResult<List<TripDto>>> GetAll(CancellationToken ct) =>
        (await MyTrips().AsNoTracking().OrderByDescending(t => t.TripDate)
            .Select(TripDto.FromEntity).ToListAsync(ct)).Select(t => Sign(t)!).ToList();

    [HttpGet("municipality/{municipalityId}")]
    public async Task<ActionResult<List<TripDto>>> GetByMunicipality(string municipalityId, CancellationToken ct) =>
        (await MyTrips().AsNoTracking().Where(t => t.MunicipalityId == municipalityId)
            .OrderBy(t => t.TripDate).Select(TripDto.FromEntity).ToListAsync(ct)).Select(t => Sign(t)!).ToList();

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TripDto>> GetById(Guid id, CancellationToken ct)
    {
        var dto = await GetDtoAsync(id, ct);
        return dto is null ? NotFound() : dto;
    }

    [HttpPost]
    public async Task<ActionResult<TripDto>> Create(TripWriteRequest req, CancellationToken ct)
    {
        if (!await _db.Municipalities.AnyAsync(m => m.Id == req.MunicipalityId, ct))
            return BadRequest(new { message = "El municipio no existe." });

        var userId = CurrentUserId;
        var trip = new TripEntry { UserId = userId, MunicipalityId = req.MunicipalityId };
        Apply(trip, req);

        if (string.IsNullOrWhiteSpace(trip.Label))
        {
            var count = await MyTrips().CountAsync(t => t.MunicipalityId == req.MunicipalityId, ct);
            trip.Label = $"Visita {count + 1}";
        }

        _db.TripEntries.Add(trip);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = trip.Id }, await GetDtoAsync(trip.Id, ct));
    }

    /// <summary>Actualiza los datos del viaje (no toca gastos ni fotos; tienen sus propios endpoints).</summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TripDto>> Update(Guid id, TripWriteRequest req, CancellationToken ct)
    {
        var trip = await MyTrips().FirstOrDefaultAsync(t => t.Id == id, ct);
        if (trip is null) return NotFound();

        if (req.MunicipalityId != trip.MunicipalityId &&
            !await _db.Municipalities.AnyAsync(m => m.Id == req.MunicipalityId, ct))
            return BadRequest(new { message = "El municipio no existe." });

        trip.MunicipalityId = req.MunicipalityId;
        Apply(trip, req);
        await _db.SaveChangesAsync(ct);

        var dto = await GetDtoAsync(id, ct);
        return dto is null ? NotFound() : dto;
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var trip = await MyTrips().Include(t => t.Photos).FirstOrDefaultAsync(t => t.Id == id, ct);
        if (trip is null) return NotFound();

        var urls = trip.Photos.Select(p => p.Url).ToList();
        _db.TripEntries.Remove(trip); // gastos y fotos se borran en cascada
        await _db.SaveChangesAsync(ct);

        foreach (var key in urls) await _photos.DeleteAsync(key, ct);
        return NoContent();
    }

    // ───────── Gastos ─────────

    [HttpPost("{id:guid}/expenses")]
    public async Task<ActionResult<ExpenseDto>> AddExpense(Guid id, ExpenseWriteRequest req, CancellationToken ct)
    {
        var trip = await MyTrips().Where(t => t.Id == id).Select(t => new { t.TripDate }).FirstOrDefaultAsync(ct);
        if (trip is null) return NotFound();

        var expense = new ExpenseLog
        {
            TripEntryId = id,
            Category = req.Category.Trim(),
            AmountCop = req.AmountCop,
            Date = req.Date ?? trip.TripDate,
            Notes = req.Notes
        };
        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync(ct);

        return Ok(new ExpenseDto(expense.Id, id, expense.Category, expense.AmountCop, expense.Date, expense.Notes));
    }

    [HttpDelete("{id:guid}/expenses/{expenseId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteExpense(Guid id, Guid expenseId, CancellationToken ct)
    {
        var expense = await _db.Expenses
            .FirstOrDefaultAsync(e => e.Id == expenseId && e.TripEntryId == id && e.TripEntry.UserId == CurrentUserId, ct);
        if (expense is null) return NotFound();

        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ───────── Fotos ─────────

    [HttpPost("{id:guid}/photos")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxPhotoBytes + 1024 * 1024)]
    public async Task<ActionResult<PhotoDto>> UploadPhoto(Guid id, [FromForm] PhotoUploadRequest req, CancellationToken ct)
    {
        if (!await MyTrips().AnyAsync(t => t.Id == id, ct)) return NotFound();

        var file = req.File;
        if (file.Length == 0) return BadRequest(new { message = "Archivo vacío." });
        if (file.Length > MaxPhotoBytes) return BadRequest(new { message = "La foto supera los 8 MB." });
        if (!LocalPhotoStorage.IsAllowed(file))
            return BadRequest(new { message = "Solo se permiten imágenes .jpg, .png o .webp." });

        var url = await _photos.SaveAsync(CurrentUserId, file, ct);
        var photo = new TripPhoto
        {
            TripEntryId = id,
            Url = url,
            Caption = req.Caption ?? Path.GetFileNameWithoutExtension(file.FileName)
        };
        _db.TripPhotos.Add(photo);
        await _db.SaveChangesAsync(ct);

        return Ok(new PhotoDto(photo.Id, id, _photos.GetUrl(photo.Url), photo.Caption, photo.UploadedAt));
    }

    [HttpDelete("{id:guid}/photos/{photoId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePhoto(Guid id, Guid photoId, CancellationToken ct)
    {
        var photo = await _db.TripPhotos
            .FirstOrDefaultAsync(p => p.Id == photoId && p.TripEntryId == id && p.TripEntry.UserId == CurrentUserId, ct);
        if (photo is null) return NotFound();

        _db.TripPhotos.Remove(photo);
        await _db.SaveChangesAsync(ct);
        await _photos.DeleteAsync(photo.Url, ct);
        return NoContent();
    }

    private static void Apply(TripEntry trip, TripWriteRequest req)
    {
        trip.TripDate = req.TripDate!.Value;
        trip.Label = req.Label?.Trim() ?? trip.Label;
        trip.Rating = req.Rating;
        trip.Summary = req.Summary;
        trip.FoodReview = req.FoodReview;
        trip.FavoriteDish = req.FavoriteDish;
        trip.DoNotForgetNotes = req.DoNotForgetNotes;
        trip.TransportMode = req.TransportMode;
        trip.RoadCondition = req.RoadCondition;
        trip.TransportNotes = req.TransportNotes;
        trip.TollCount = req.TollCount;
    }
}
