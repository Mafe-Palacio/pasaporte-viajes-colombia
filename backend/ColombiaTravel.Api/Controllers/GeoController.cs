using ColombiaTravel.Api.Data;
using ColombiaTravel.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColombiaTravel.Api.Controllers;

[Route("api/geo")]
[Authorize]
public class GeoController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public GeoController(AppDbContext db) => _db = db;

    private Task<string?> GetHomeIdAsync(CancellationToken ct) =>
        _db.Users.AsNoTracking()
            .Where(u => u.Id == CurrentUserId)
            .Select(u => u.HomeMunicipalityId)
            .FirstOrDefaultAsync(ct);

    /// <summary>Los 33 departamentos con el progreso del usuario.</summary>
    [HttpGet("departments")]
    public async Task<ActionResult<List<DepartmentDto>>> GetDepartments(CancellationToken ct)
        => await _db.GetDepartmentsForUserAsync(CurrentUserId, await GetHomeIdAsync(ct), ct);

    /// <summary>Municipios de un departamento con su estado de visita.</summary>
    [HttpGet("departments/{departmentId}/municipalities")]
    public async Task<ActionResult<List<MunicipalityDto>>> GetMunicipalities(string departmentId, CancellationToken ct)
    {
        var userId = CurrentUserId;
        var homeId = await GetHomeIdAsync(ct);

        if (!await _db.Departments.AnyAsync(d => d.Id == departmentId, ct))
            return NotFound(new { message = "Departamento no encontrado." });

        return await _db.Municipalities
            .AsNoTracking()
            .Where(m => m.DepartmentId == departmentId)
            .OrderBy(m => m.Name)
            .Select(m => new MunicipalityDto(
                m.Id, m.Name, m.DepartmentId, m.Department.Name, m.Latitude, m.Longitude,
                m.Id == homeId || m.TripEntries.Any(t => t.UserId == userId),
                m.Id == homeId,
                m.TripEntries.Count(t => t.UserId == userId)))
            .ToListAsync(ct);
    }

    /// <summary>Marca un municipio como "Mi hogar".</summary>
    [HttpPut("home/{municipalityId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetHome(string municipalityId, CancellationToken ct)
    {
        if (!await _db.Municipalities.AnyAsync(m => m.Id == municipalityId, ct))
            return NotFound(new { message = "Municipio no encontrado." });

        var user = await _db.Users.FirstAsync(u => u.Id == CurrentUserId, ct);
        user.HomeMunicipalityId = municipalityId;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("home")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ClearHome(CancellationToken ct)
    {
        var user = await _db.Users.FirstAsync(u => u.Id == CurrentUserId, ct);
        user.HomeMunicipalityId = null;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
