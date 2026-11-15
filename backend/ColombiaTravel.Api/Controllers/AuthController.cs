using ColombiaTravel.Api.Data;
using ColombiaTravel.Api.Dtos;
using ColombiaTravel.Api.Models;
using ColombiaTravel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColombiaTravel.Api.Controllers;

[Route("api/auth")]
public class AuthController : ApiControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;

    public AuthController(AppDbContext db, ITokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            return Conflict(new { message = "El email ya se encuentra registrado." });

        var user = new ApplicationUser
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };
        _db.Users.Add(user);

        var response = IssueTokens(user);
        await _db.SaveChangesAsync(ct);
        return Ok(response);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // Mismo mensaje para "no existe" y "clave mala": no revelamos qué correos están registrados.
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Credenciales incorrectas." });

        var response = IssueTokens(user);
        await _db.SaveChangesAsync(ct);
        return Ok(response);
    }

    /// <summary>Cambia un refresh token válido por un nuevo par de tokens (rotación).</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken ct)
    {
        var hash = _tokens.HashRefreshToken(request.RefreshToken);
        var user = await _db.Users.FirstOrDefaultAsync(
            u => u.RefreshTokenHash == hash && u.RefreshTokenExpiryTime > DateTime.UtcNow, ct);

        if (user is null) return Unauthorized(new { message = "Sesión expirada. Inicia sesión de nuevo." });

        var response = IssueTokens(user);
        await _db.SaveChangesAsync(ct);
        return Ok(response);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var user = await _db.Users.FindAsync(new object[] { CurrentUserId }, ct);
        if (user is not null)
        {
            user.RefreshTokenHash = null;
            user.RefreshTokenExpiryTime = null;
            await _db.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me(CancellationToken ct)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == CurrentUserId, ct);
        if (user is null) return Unauthorized();
        return new UserDto(user.Id, user.Name, user.Email, user.HomeMunicipalityId);
    }

    // Crea los tokens y deja el hash del refresh token en la entidad (el SaveChanges lo hace quien llama).
    private AuthResponse IssueTokens(ApplicationUser user)
    {
        var (access, expires) = _tokens.CreateAccessToken(user);
        var (refresh, refreshHash, refreshExpires) = _tokens.CreateRefreshToken();

        user.RefreshTokenHash = refreshHash;
        user.RefreshTokenExpiryTime = refreshExpires;

        return new AuthResponse(access, refresh, expires,
            new UserDto(user.Id, user.Name, user.Email, user.HomeMunicipalityId));
    }
}
