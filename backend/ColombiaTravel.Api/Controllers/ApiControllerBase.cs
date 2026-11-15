using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace ColombiaTravel.Api.Controllers;

/// <summary>Base común: expone el Id del usuario autenticado leído del JWT.</summary>
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    // Solo se usa en controladores con [Authorize], así que el claim siempre existe.
    // Si faltara, lanzamos error en vez de usar un usuario "por defecto".
    protected Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? id
            : throw new UnauthorizedAccessException("Token sin identificador de usuario.");
}
