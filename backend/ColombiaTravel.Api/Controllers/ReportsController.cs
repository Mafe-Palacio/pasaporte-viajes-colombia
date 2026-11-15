using ColombiaTravel.Api.Data;
using ColombiaTravel.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColombiaTravel.Api.Controllers;

[Route("api/reports")]
[Authorize]
public class ReportsController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db) => _db = db;

    /// <summary>Zona de reportes: dinero gastado en todos los viajes y lugares que faltan por departamento.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ReportSummaryDto>> Summary(CancellationToken ct)
    {
        var userId = CurrentUserId;
        var homeId = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId).Select(u => u.HomeMunicipalityId).FirstOrDefaultAsync(ct);

        var departments = await _db.GetDepartmentsForUserAsync(userId, homeId, ct);

        var myExpenses = _db.Expenses.AsNoTracking().Where(e => e.TripEntry.UserId == userId);

        // Las consultas SQL devuelven tipos anónimos simples; ordenar y armar los DTOs se hace en memoria
        // (son pocas filas). Así EF Core no tiene que traducir OrderBy sobre un DTO con constructor.
        var categoryRows = await myExpenses
            .GroupBy(e => e.Category)
            .Select(g => new { Category = g.Key, Total = g.Sum(e => e.AmountCop) })
            .ToListAsync(ct);

        var byCategory = categoryRows
            .OrderByDescending(r => r.Total)
            .Select(r => new CategorySpendDto(r.Category, r.Total))
            .ToList();

        var spendRows = await myExpenses
            .GroupBy(e => new { e.TripEntry.Municipality.DepartmentId, e.TripEntry.Municipality.Department.Name })
            .Select(g => new { g.Key.DepartmentId, g.Key.Name, Total = g.Sum(e => e.AmountCop) })
            .ToListAsync(ct);

        var tripsByDepartment = await _db.TripEntries.AsNoTracking()
            .Where(t => t.UserId == userId)
            .GroupBy(t => t.Municipality.DepartmentId)
            .Select(g => new { DepartmentId = g.Key, Trips = g.Count() })
            .ToDictionaryAsync(x => x.DepartmentId, x => x.Trips, ct);

        var byDepartment = spendRows
            .OrderByDescending(r => r.Total)
            .Select(r => new DepartmentSpendDto(
                r.DepartmentId, r.Name, r.Total,
                tripsByDepartment.GetValueOrDefault(r.DepartmentId)))
            .ToList();

        var totalTrips = await _db.TripEntries.CountAsync(t => t.UserId == userId, ct);

        return new ReportSummaryDto(
            TotalSpentCop: byCategory.Sum(c => c.TotalCop),
            TotalTrips: totalTrips,
            MunicipalitiesVisited: departments.Sum(d => d.VisitedMunicipalities),
            MunicipalitiesTotal: departments.Sum(d => d.TotalMunicipalities),
            DepartmentsVisited: departments.Count(d => d.IsVisited),
            DepartmentsTotal: departments.Count,
            SpentByCategory: byCategory,
            SpentByDepartment: byDepartment,
            Departments: departments);
    }
}
