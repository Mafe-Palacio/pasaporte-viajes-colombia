using ColombiaTravel.Api.Data;
using ColombiaTravel.Api.Dtos;
using ColombiaTravel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColombiaTravel.Api.Controllers;

[Route("api/memories")]
[Authorize]
public class MemoriesController : ApiControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPhotoStorage _photos;

    public MemoriesController(AppDbContext db, IPhotoStorage photos)
    {
        _db = db;
        _photos = photos;
    }

    /// <summary>
    /// Muro de Recuerdos: los viajes que tienen fotos, cada uno con sus fotos.
    /// Filtros opcionales: departmentId (ej. "risaralda") y search (municipio, departamento, nombre del viaje o pie de foto).
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<MemoriesDto>> Get(
        [FromQuery] string? departmentId, [FromQuery] string? search, CancellationToken ct)
    {
        var userId = CurrentUserId;

        // Botones de filtro: departamentos donde el usuario tiene fotos (sin aplicar los filtros)
        var departments = (await _db.TripPhotos.AsNoTracking()
                .Where(p => p.TripEntry.UserId == userId)
                .Select(p => new
                {
                    Id = p.TripEntry.Municipality.DepartmentId,
                    Name = p.TripEntry.Municipality.Department.Name
                })
                .Distinct()
                .ToListAsync(ct))
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentOptionDto(d.Id, d.Name))
            .ToList();

        var query = _db.TripEntries.AsNoTracking()
            .Where(t => t.UserId == userId && t.Photos.Any());

        if (!string.IsNullOrWhiteSpace(departmentId))
            query = query.Where(t => t.Municipality.DepartmentId == departmentId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var like = "%" + search.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            query = query.Where(t =>
                EF.Functions.ILike(t.Municipality.Name, like) ||
                EF.Functions.ILike(t.Municipality.Department.Name, like) ||
                EF.Functions.ILike(t.Label, like) ||
                t.Photos.Any(p => p.Caption != null && EF.Functions.ILike(p.Caption, like)));
        }

        var rows = await query
            .OrderByDescending(t => t.TripDate)
            .Select(t => new
            {
                t.Id,
                t.Label,
                t.TripDate,
                t.MunicipalityId,
                MunicipalityName = t.Municipality.Name,
                DepartmentId = t.Municipality.DepartmentId,
                DepartmentName = t.Municipality.Department.Name,
                Photos = t.Photos
                    .OrderByDescending(p => p.UploadedAt)
                    .Select(p => new { p.Id, p.Url, p.Caption, p.UploadedAt })
                    .ToList()
            })
            .ToListAsync(ct);

        var trips = rows.Select(r => new MemoryTripDto(
            r.Id, r.Label, r.TripDate, r.MunicipalityId, r.MunicipalityName,
            r.DepartmentId, r.DepartmentName,
            r.Photos.Select(p => new PhotoDto(p.Id, r.Id, _photos.GetUrl(p.Url), p.Caption, p.UploadedAt)).ToList()
        )).ToList();

        return new MemoriesDto(
            TotalPhotos: trips.Sum(t => t.Photos.Count),
            TotalMunicipalities: trips.Select(t => t.MunicipalityId).Distinct().Count(),
            Departments: departments,
            Trips: trips);
    }
}
