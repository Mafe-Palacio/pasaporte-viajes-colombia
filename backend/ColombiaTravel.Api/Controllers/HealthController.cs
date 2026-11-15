using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ColombiaTravel.Api.Controllers;

/// <summary>El front la consulta para saber si el servidor está disponible.</summary>
[Route("api/health")]
[AllowAnonymous]
public class HealthController : ApiControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", timeUtc = DateTime.UtcNow });
}
