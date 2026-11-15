using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using ColombiaTravel.Api.Models;

namespace ColombiaTravel.Api.Dtos;

// ───────────── Auth ─────────────

public class RegisterRequest
{
    [Required, MaxLength(100)] public string Name { get; set; } = string.Empty;
    [Required, EmailAddress, MaxLength(150)] public string Email { get; set; } = string.Empty;
    [Required, MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres."), MaxLength(100)]
    public string Password { get; set; } = string.Empty;
}

public class LoginRequest
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
}

public class RefreshRequest
{
    [Required] public string RefreshToken { get; set; } = string.Empty;
}

public record UserDto(Guid Id, string Name, string Email, string? HomeMunicipalityId);

public record AuthResponse(string Token, string RefreshToken, DateTime ExpiresAtUtc, UserDto User);

// ───────────── Geo ─────────────

public record DepartmentDto
{
    public string Id { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Capital { get; init; } = string.Empty;
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public string? Description { get; init; }
    public int TotalMunicipalities { get; init; }
    public int VisitedMunicipalities { get; init; }
    public int RemainingMunicipalities { get; init; }
    public bool IsVisited { get; init; }
    public int ProgressPercentage { get; init; }
}

public record MunicipalityDto(
    string Id, string Name, string DepartmentId, string DepartmentName,
    double Latitude, double Longitude, bool IsVisited, bool IsHome, int TripsCount);

// ───────────── Trips ─────────────

public class TripWriteRequest
{
    /// <summary>Opcional: el front genera el Id (GUID) para poder reintentar sin duplicar.</summary>
    public Guid? Id { get; set; }
    [Required, MaxLength(5)] public string MunicipalityId { get; set; } = string.Empty;
    [Required] public DateOnly? TripDate { get; set; }
    [MaxLength(100)] public string? Label { get; set; }
    [Range(1, 5)] public int Rating { get; set; } = 5;
    public string? Summary { get; set; }
    public string? FoodReview { get; set; }
    public string? FavoriteDish { get; set; }
    public string? DoNotForgetNotes { get; set; }
    public string? TransportMode { get; set; }
    public string? RoadCondition { get; set; }
    public string? TransportNotes { get; set; }
    [Range(0, 100)] public int TollCount { get; set; }
}

public class ExpenseWriteRequest
{
    /// <summary>Opcional: Id generado por el front (GUID).</summary>
    public Guid? Id { get; set; }
    [Required, MaxLength(50)] public string Category { get; set; } = "Comida";
    [Range(0, 1_000_000_000)] public decimal AmountCop { get; set; }
    public DateOnly? Date { get; set; }
    [MaxLength(500)] public string? Notes { get; set; }
}

public class PhotoUploadRequest
{
    [Required] public IFormFile File { get; set; } = null!;
    [MaxLength(255)] public string? Caption { get; set; }
}

public record ExpenseDto(Guid Id, Guid TripEntryId, string Category, decimal AmountCop, DateOnly Date, string? Notes);

public record PhotoDto(Guid Id, Guid TripEntryId, string Url, string? Caption, DateTime UploadedAt);

public class TripDto
{
    public Guid Id { get; set; }
    public string MunicipalityId { get; set; } = string.Empty;
    public string MunicipalityName { get; set; } = string.Empty;
    public string DepartmentId { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public DateOnly TripDate { get; set; }
    public string Label { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Summary { get; set; }
    public string? FoodReview { get; set; }
    public string? FavoriteDish { get; set; }
    public string? DoNotForgetNotes { get; set; }
    public string? TransportMode { get; set; }
    public string? RoadCondition { get; set; }
    public string? TransportNotes { get; set; }
    public int TollCount { get; set; }
    public decimal TotalSpentCop { get; set; }
    public List<ExpenseDto> Expenses { get; set; } = new();
    public List<PhotoDto> Photos { get; set; } = new();

    /// <summary>Proyección que EF Core traduce a SQL (sin ciclos entre entidades).</summary>
    public static readonly Expression<Func<TripEntry, TripDto>> FromEntity = t => new TripDto
    {
        Id = t.Id,
        MunicipalityId = t.MunicipalityId,
        MunicipalityName = t.Municipality.Name,
        DepartmentId = t.Municipality.DepartmentId,
        DepartmentName = t.Municipality.Department.Name,
        TripDate = t.TripDate,
        Label = t.Label,
        Rating = t.Rating,
        Summary = t.Summary,
        FoodReview = t.FoodReview,
        FavoriteDish = t.FavoriteDish,
        DoNotForgetNotes = t.DoNotForgetNotes,
        TransportMode = t.TransportMode,
        RoadCondition = t.RoadCondition,
        TransportNotes = t.TransportNotes,
        TollCount = t.TollCount,
        TotalSpentCop = t.Expenses.Sum(e => (decimal?)e.AmountCop) ?? 0m,
        Expenses = t.Expenses
            .OrderBy(e => e.Date)
            .Select(e => new ExpenseDto(e.Id, e.TripEntryId, e.Category, e.AmountCop, e.Date, e.Notes))
            .ToList(),
        Photos = t.Photos
            .OrderByDescending(p => p.UploadedAt)
            .Select(p => new PhotoDto(p.Id, p.TripEntryId, p.Url, p.Caption, p.UploadedAt))
            .ToList()
    };
}

// ───────────── Reports ─────────────

public record CategorySpendDto(string Category, decimal TotalCop);
public record DepartmentSpendDto(string DepartmentId, string DepartmentName, decimal TotalCop, int Trips);

public record ReportSummaryDto(
    decimal TotalSpentCop,
    int TotalTrips,
    int MunicipalitiesVisited,
    int MunicipalitiesTotal,
    int DepartmentsVisited,
    int DepartmentsTotal,
    List<CategorySpendDto> SpentByCategory,
    List<DepartmentSpendDto> SpentByDepartment,
    List<DepartmentDto> Departments);
