using ColombiaTravel.Api.Dtos;
using ColombiaTravel.Api.Models;
using Microsoft.EntityFrameworkCore;

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

        modelBuilder.Entity<ApplicationUser>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.HasIndex(u => u.RefreshTokenHash);

            // "Mi hogar": si se borra el municipio, solo se limpia la referencia
            e.HasOne<Municipality>()
             .WithMany()
             .HasForeignKey(u => u.HomeMunicipalityId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Department>(e =>
        {
            e.HasIndex(d => d.Code).IsUnique();
        });

        modelBuilder.Entity<Municipality>(e =>
        {
            e.HasIndex(m => m.DepartmentId);
            e.HasOne(m => m.Department)
             .WithMany(d => d.Municipalities)
             .HasForeignKey(m => m.DepartmentId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TripEntry>(e =>
        {
            e.HasIndex(t => new { t.UserId, t.MunicipalityId });
            e.HasIndex(t => t.TripDate);

            // Restrict: no se debe poder borrar un municipio del catálogo con viajes
            e.HasOne(t => t.Municipality)
             .WithMany(m => m.TripEntries)
             .HasForeignKey(t => t.MunicipalityId)
             .OnDelete(DeleteBehavior.Restrict);

            // Si se borra el usuario, se borran sus viajes
            e.HasOne(t => t.User)
             .WithMany(u => u.TripEntries)
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExpenseLog>(e =>
        {
            e.HasIndex(x => x.TripEntryId);
            e.HasOne(x => x.TripEntry)
             .WithMany(t => t.Expenses)
             .HasForeignKey(x => x.TripEntryId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TripPhoto>(e =>
        {
            e.HasIndex(p => p.TripEntryId);
            e.HasOne(p => p.TripEntry)
             .WithMany(t => t.Photos)
             .HasForeignKey(p => p.TripEntryId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }

    /// <summary>
    /// Departamentos con el progreso del usuario (visitados / total), en una sola consulta SQL.
    /// Un municipio cuenta como visitado si el usuario tiene al menos un viaje ahí o es su hogar.
    /// </summary>
    public async Task<List<DepartmentDto>> GetDepartmentsForUserAsync(
        Guid userId, string? homeMunicipalityId, CancellationToken ct = default)
    {
        var rows = await Departments
            .AsNoTracking()
            .OrderBy(d => d.Name)
            .Select(d => new
            {
                d.Id,
                d.Code,
                d.Name,
                d.Capital,
                d.Latitude,
                d.Longitude,
                d.Description,
                Total = d.Municipalities.Count(),
                Visited = d.Municipalities.Count(m =>
                    m.Id == homeMunicipalityId ||
                    m.TripEntries.Any(t => t.UserId == userId))
            })
            .ToListAsync(ct);

        return rows.Select(r => new DepartmentDto
        {
            Id = r.Id,
            Code = r.Code,
            Name = r.Name,
            Capital = r.Capital,
            Latitude = r.Latitude,
            Longitude = r.Longitude,
            Description = r.Description,
            TotalMunicipalities = r.Total,
            VisitedMunicipalities = r.Visited,
            RemainingMunicipalities = r.Total - r.Visited,
            IsVisited = r.Visited > 0,
            ProgressPercentage = r.Total > 0 ? (int)Math.Round(r.Visited * 100.0 / r.Total) : 0
        }).ToList();
    }
}
