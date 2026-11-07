using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColombiaTravel.Api.Models;

public class ApplicationUser
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<TripEntry> TripEntries { get; set; } = new List<TripEntry>();
}

public class Department
{
    [Key]
    public string Id { get; set; } = string.Empty; // e.g. "quindio"

    [Required, MaxLength(10)]
    public string DivipolaCode { get; set; } = string.Empty; // e.g. "63"

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Capital { get; set; } = string.Empty;

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public int TotalMunicipalities { get; set; }
    public string? Description { get; set; }

    // Navigation
    public ICollection<Municipality> Municipalities { get; set; } = new List<Municipality>();
}

public class Municipality
{
    [Key]
    public string Id { get; set; } = string.Empty; // e.g. "salento"

    [Required, MaxLength(10)]
    public string DivipolaCode { get; set; } = string.Empty; // e.g. "63690"

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string DepartmentId { get; set; } = string.Empty;

    [ForeignKey(nameof(DepartmentId))]
    public Department Department { get; set; } = null!;

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public string? Description { get; set; }
    public string? CoverPhoto { get; set; }

    // Navigation
    public ICollection<TripEntry> TripEntries { get; set; } = new List<TripEntry>();
}

public class TripEntry
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public string MunicipalityId { get; set; } = string.Empty;

    [ForeignKey(nameof(MunicipalityId))]
    public Municipality Municipality { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public ApplicationUser User { get; set; } = null!;

    [Required]
    public DateOnly TripDate { get; set; }

    [MaxLength(100)]
    public string Label { get; set; } = string.Empty; // "Visita 1: 15/Mar/2023"

    [Range(1, 5)]
    public int Rating { get; set; } = 5;

    public string? Summary { get; set; }
    public string? FoodReview { get; set; }
    public string? FavoriteDish { get; set; }
    public string? TransportNotes { get; set; }
    public string? RoadCondition { get; set; }
    public bool HasTolls { get; set; }
    public int TollCount { get; set; }
    public string? DoNotForgetNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<ExpenseLog> Expenses { get; set; } = new List<ExpenseLog>();
    public ICollection<TripPhoto> Photos { get; set; } = new List<TripPhoto>();
}

public class ExpenseLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid TripEntryId { get; set; }

    [ForeignKey(nameof(TripEntryId))]
    public TripEntry TripEntry { get; set; } = null!;

    [Required, MaxLength(50)]
    public string Category { get; set; } = "Comida"; // Comida, Peajes, Hospedaje, Otros

    [Column(TypeName = "decimal(18,2)")]
    public decimal AmountCop { get; set; }

    public DateOnly Date { get; set; }
    public string? Notes { get; set; }
}

public class TripPhoto
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid TripEntryId { get; set; }

    [ForeignKey(nameof(TripEntryId))]
    public TripEntry TripEntry { get; set; } = null!;

    [Required, MaxLength(500)]
    public string Url { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Caption { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
