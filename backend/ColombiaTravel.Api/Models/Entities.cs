using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColombiaTravel.Api.Models;

public class ApplicationUser
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string Email { get; set; } = string.Empty; // siempre en minúscula

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    // Solo guardamos el HASH del refresh token (nunca el token en claro)
    public string? RefreshTokenHash { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }

    // Municipio donde vive el usuario ("Mi hogar"). Cuenta como visitado.
    public string? HomeMunicipalityId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TripEntry> TripEntries { get; set; } = new List<TripEntry>();
}

public class Department
{
    [Key]
    public string Id { get; set; } = string.Empty; // slug del front: "quindio"

    [Required, MaxLength(2)]
    public string Code { get; set; } = string.Empty; // DIVIPOLA: "63"

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Capital { get; set; } = string.Empty;

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public int TotalMunicipalities { get; set; }
    public string? Description { get; set; }

    public ICollection<Municipality> Municipalities { get; set; } = new List<Municipality>();
}

public class Municipality
{
    // Código DIVIPOLA de 5 dígitos: "63690". Es la llave primaria.
    [Key, MaxLength(5)]
    public string Id { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string DepartmentId { get; set; } = string.Empty;

    [ForeignKey(nameof(DepartmentId))]
    public Department Department { get; set; } = null!;

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public ICollection<TripEntry> TripEntries { get; set; } = new List<TripEntry>();
}

public class TripEntry
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(5)]
    public string MunicipalityId { get; set; } = string.Empty;

    [ForeignKey(nameof(MunicipalityId))]
    public Municipality Municipality { get; set; } = null!;

    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public ApplicationUser User { get; set; } = null!;

    public DateOnly TripDate { get; set; }

    [MaxLength(100)]
    public string Label { get; set; } = string.Empty; // "Visita 1"

    [Range(1, 5)]
    public int Rating { get; set; } = 5;

    public string? Summary { get; set; }
    public string? FoodReview { get; set; }
    public string? FavoriteDish { get; set; }
    public string? DoNotForgetNotes { get; set; }

    // Transporte
    public string? TransportMode { get; set; }
    public string? RoadCondition { get; set; }
    public string? TransportNotes { get; set; }
    public int TollCount { get; set; }

    // Clima
    [MaxLength(20)]
    public string? ClimateFeeling { get; set; }   // "caliente" | "templado" | "frio" | "paramo"

    [MaxLength(1000)]
    public string? ClimateNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ExpenseLog> Expenses { get; set; } = new List<ExpenseLog>();
    public ICollection<TripPhoto> Photos { get; set; } = new List<TripPhoto>();
}

public class ExpenseLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripEntryId { get; set; }

    [ForeignKey(nameof(TripEntryId))]
    public TripEntry TripEntry { get; set; } = null!;

    [Required, MaxLength(50)]
    public string Category { get; set; } = "Comida";

    [Column(TypeName = "numeric(18,2)")]
    public decimal AmountCop { get; set; }

    public DateOnly Date { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class TripPhoto
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripEntryId { get; set; }

    [ForeignKey(nameof(TripEntryId))]
    public TripEntry TripEntry { get; set; } = null!;

    [Required, MaxLength(500)]
    public string Url { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Caption { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
