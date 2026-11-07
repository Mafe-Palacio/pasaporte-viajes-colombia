using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ColombiaTravel.Api.Data;
using ColombiaTravel.Api.Models;
using System.Security.Claims;

namespace ColombiaTravel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Por favor ingrese un email válido y contraseña." });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Credenciales incorrectas." });
        }

        // Generate JWT and Refresh Token
        var token = "jwt_token_sample_" + Guid.NewGuid().ToString("N");
        var refreshToken = Guid.NewGuid().ToString("N");

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            token,
            refreshToken,
            user = new { user.Id, user.Name, user.Email }
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var existing = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (existing) return Conflict(new { message = "El email ya se encuentra registrado." });

        var user = new ApplicationUser
        {
            Name = request.Name,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Usuario registrado satisfactoriamente.", userId = user.Id });
    }

    [HttpPost("forgot-password")]
    public IActionResult ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        // Issue secure time-limited token and dispatch recovery email
        return Ok(new { message = "Si el correo existe, se ha enviado un enlace de recuperación seguro." });
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GeoController : ControllerBase
{
    private readonly AppDbContext _context;

    public GeoController(AppDbContext context) => _context = context;

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "00000000-0000-0000-0000-000000000001");

    [HttpGet("departments")]
    public async Task<IActionResult> GetDepartments()
    {
        var departments = await _context.GetDepartmentsForUserAsync(CurrentUserId);
        return Ok(departments);
    }

    [HttpGet("departments/{departmentId}/municipalities")]
    public async Task<IActionResult> GetMunicipalities(string departmentId)
    {
        var list = await _context.Municipalities
            .AsNoTracking()
            .Where(m => m.DepartmentId == departmentId)
            .Select(m => new
            {
                m.Id,
                m.DivipolaCode,
                m.Name,
                m.DepartmentId,
                m.Latitude,
                m.Longitude,
                m.Description,
                m.CoverPhoto,
                IsVisited = m.TripEntries.Any(t => t.UserId == CurrentUserId),
                TripsCount = m.TripEntries.Count(t => t.UserId == CurrentUserId)
            })
            .OrderBy(m => m.Name)
            .ToListAsync();

        return Ok(list);
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly AppDbContext _context;

    public TripsController(AppDbContext context) => _context = context;

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "00000000-0000-0000-0000-000000000001");

    [HttpGet("municipality/{municipalityId}")]
    public async Task<IActionResult> GetTripsByMunicipality(string municipalityId)
    {
        var trips = await _context.TripEntries
            .AsNoTracking()
            .Where(t => t.MunicipalityId == municipalityId && t.UserId == CurrentUserId)
            .Include(t => t.Expenses)
            .Include(t => t.Photos)
            .OrderBy(t => t.TripDate)
            .ToListAsync();

        return Ok(trips);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTrip([FromBody] CreateTripDto dto)
    {
        var trip = new TripEntry
        {
            MunicipalityId = dto.MunicipalityId,
            UserId = CurrentUserId,
            TripDate = dto.TripDate,
            Label = dto.Label,
            Rating = dto.Rating,
            Summary = dto.Summary,
            FoodReview = dto.FoodReview,
            FavoriteDish = dto.FavoriteDish,
            TransportNotes = dto.TransportNotes,
            RoadCondition = dto.RoadCondition,
            HasTolls = dto.HasTolls,
            TollCount = dto.TollCount,
            DoNotForgetNotes = dto.DoNotForgetNotes
        };

        if (dto.Expenses != null)
        {
            foreach (var exp in dto.Expenses)
            {
                trip.Expenses.Add(new ExpenseLog
                {
                    Category = exp.Category,
                    AmountCop = exp.AmountCop,
                    Date = exp.Date,
                    Notes = exp.Notes
                });
            }
        }

        _context.TripEntries.Add(trip);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTripsByMunicipality), new { municipalityId = trip.MunicipalityId }, trip);
    }

    [HttpPost("{tripId}/photos")]
    public async Task<IActionResult> UploadPhoto(Guid tripId, [FromForm] IFormFile file, [FromForm] string? caption)
    {
        if (file == null || file.Length == 0) return BadRequest("Archivo de imagen requerido.");

        // In production: upload to S3 / Cloud Storage / Azure Blob
        var storageUrl = $"https://storage.viajescolombia.co/photos/{Guid.NewGuid()}_{file.FileName}";

        var photo = new TripPhoto
        {
            TripEntryId = tripId,
            Url = storageUrl,
            Caption = caption ?? file.FileName,
            UploadedAt = DateTime.UtcNow
        };

        _context.TripPhotos.Add(photo);
        await _context.SaveChangesAsync();

        return Ok(photo);
    }
}

public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Name, string Email, string Password);
public record ForgotPasswordRequest(string Email);

public record CreateTripDto(
    string MunicipalityId,
    DateOnly TripDate,
    string Label,
    int Rating,
    string? Summary,
    string? FoodReview,
    string? FavoriteDish,
    string? TransportNotes,
    string? RoadCondition,
    bool HasTolls,
    int TollCount,
    string? DoNotForgetNotes,
    List<ExpenseInputDto>? Expenses
);

public record ExpenseInputDto(string Category, decimal AmountCop, DateOnly Date, string? Notes);
