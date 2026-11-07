using Microsoft.EntityFrameworkCore;
using ColombiaTravel.Api.Models;

namespace ColombiaTravel.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<ApplicationUser> Users => Set<ApplicationUser>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Municipality> Municipalities => Set<Municipality>();
    public DbSet<TripEntry> TripEntries => Set<TripEntry>();
    public DbSet<ExpenseLog> Expenses => Set<ExpenseLog>();
    public DbSet<TripPhoto> TripPhotos => Set<TripPhoto>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User constraints
        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
        });

        // Department indexes
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasIndex(d => d.DivipolaCode).IsUnique();
        });

        // Municipality indexes
        modelBuilder.Entity<Municipality>(entity =>
        {
            entity.HasIndex(m => m.DivipolaCode).IsUnique();
            entity.HasIndex(m => m.DepartmentId);
        });

        // TripEntry performance indexes for Fast IsVisited calculations
        modelBuilder.Entity<TripEntry>(entity =>
        {
            entity.HasIndex(t => new { t.UserId, t.MunicipalityId });
            entity.HasIndex(t => t.TripDate);

            entity.HasOne(t => t.Municipality)
                  .WithMany(m => m.TripEntries)
                  .HasForeignKey(t => t.MunicipalityId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(t => t.User)
                  .WithMany(u => u.TripEntries)
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ExpenseLog cascading
        modelBuilder.Entity<ExpenseLog>(entity =>
        {
            entity.HasIndex(e => e.TripEntryId);
            entity.HasOne(e => e.TripEntry)
                  .WithMany(t => t.Expenses)
                  .HasForeignKey(e => e.TripEntryId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // TripPhoto cascading
        modelBuilder.Entity<TripPhoto>(entity =>
        {
            entity.HasIndex(p => p.TripEntryId);
            entity.HasOne(p => p.TripEntry)
                  .WithMany(t => t.Photos)
                  .HasForeignKey(p => p.TripEntryId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }

    /// <summary>
    /// Optimized single-roundtrip query with SQL GROUP BY & EXISTS projections.
    /// Avoids N+1 queries and memory bloat when retrieving country department explorer status.
    /// </summary>
    public async Task<List<DepartmentDto>> GetDepartmentsForUserAsync(Guid userId, CancellationToken ct = default)
    {
        return await Departments
            .AsNoTracking()
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                DivipolaCode = d.DivipolaCode,
                Name = d.Name,
                Capital = d.Capital,
                Latitude = d.Latitude,
                Longitude = d.Longitude,
                TotalMunicipalities = d.TotalMunicipalities,
                VisitedMunicipalities = d.Municipalities
                    .Count(m => m.TripEntries.Any(t => t.UserId == userId)),
                IsVisited = d.Municipalities
                    .Any(m => m.TripEntries.Any(t => t.UserId == userId)),
                ProgressPercentage = d.TotalMunicipalities > 0
                    ? (int)Math.Round((double)d.Municipalities.Count(m => m.TripEntries.Any(t => t.UserId == userId)) / d.TotalMunicipalities * 100)
                    : 0
            })
            .OrderBy(d => d.Name)
            .ToListAsync(ct);
    }
}

public record DepartmentDto
{
    public string Id { get; init; } = string.Empty;
    public string DivipolaCode { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Capital { get; init; } = string.Empty;
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public int TotalMunicipalities { get; init; }
    public int VisitedMunicipalities { get; init; }
    public bool IsVisited { get; init; }
    public int ProgressPercentage { get; init; }
}
