using System.Text.Json;
using ColombiaTravel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ColombiaTravel.Api.Data;

/// <summary>
/// Carga el catálogo oficial (33 departamentos y 1.122 municipios DIVIPOLA) la primera vez.
/// Si las tablas ya tienen datos, no hace nada.
/// </summary>
public static class DbSeeder
{
    private record DepartmentSeed(string Id, string Code, string Name, string Capital,
        double Latitude, double Longitude, string? Description);

    private record MunicipalitySeed(string Code, string DepartmentCode, string Name,
        double Latitude, double Longitude);

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public static async Task SeedAsync(AppDbContext db, string contentRootPath, ILogger logger)
    {
        if (await db.Departments.AnyAsync()) return;

        var seedDir = Path.Combine(contentRootPath, "Data", "Seed");

        var departments = JsonSerializer.Deserialize<List<DepartmentSeed>>(
            await File.ReadAllTextAsync(Path.Combine(seedDir, "departments.json")), JsonOptions)
            ?? throw new InvalidOperationException("departments.json vacío o inválido.");

        var municipalities = JsonSerializer.Deserialize<List<MunicipalitySeed>>(
            await File.ReadAllTextAsync(Path.Combine(seedDir, "municipalities.json")), JsonOptions)
            ?? throw new InvalidOperationException("municipalities.json vacío o inválido.");

        var deptIdByCode = departments.ToDictionary(d => d.Code, d => d.Id);

        db.Departments.AddRange(departments.Select(d => new Department
        {
            Id = d.Id,
            Code = d.Code,
            Name = d.Name,
            Capital = d.Capital,
            Latitude = d.Latitude,
            Longitude = d.Longitude,
            Description = d.Description,
            TotalMunicipalities = municipalities.Count(m => m.DepartmentCode == d.Code)
        }));

        db.Municipalities.AddRange(municipalities.Select(m => new Municipality
        {
            Id = m.Code,
            Name = m.Name,
            DepartmentId = deptIdByCode[m.DepartmentCode],
            Latitude = m.Latitude,
            Longitude = m.Longitude
        }));

        await db.SaveChangesAsync();
        logger.LogInformation("Seed completado: {D} departamentos, {M} municipios.",
            departments.Count, municipalities.Count);
    }
}
