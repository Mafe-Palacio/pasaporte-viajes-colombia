namespace ColombiaTravel.Api.Services;

/// <summary>
/// Abstracción para guardar fotos. Hoy es disco local; mañana se puede cambiar por
/// Cloudflare R2 / Azure Blob / Supabase Storage sin tocar los controladores.
/// </summary>
public interface IPhotoStorage
{
    /// <summary>Guarda la foto y devuelve la "llave" (key) que se almacena en la base de datos.</summary>
    Task<string> SaveAsync(Guid userId, IFormFile file, CancellationToken ct);

    /// <summary>Convierte la llave guardada en una URL que el navegador pueda abrir.</summary>
    string GetUrl(string key);

    Task DeleteAsync(string key, CancellationToken ct = default);
}

public class LocalPhotoStorage : IPhotoStorage
{
    public const string RequestPath = "/uploads";
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".jpg", ".jpeg", ".png", ".webp" };

    private readonly string _root;

    public LocalPhotoStorage(IWebHostEnvironment env)
    {
        _root = Path.Combine(env.ContentRootPath, "uploads");
        Directory.CreateDirectory(_root);
    }

    public string RootPath => _root;

    public static bool IsAllowed(IFormFile file) =>
        AllowedExtensions.Contains(Path.GetExtension(file.FileName)) &&
        file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);

    public async Task<string> SaveAsync(Guid userId, IFormFile file, CancellationToken ct)
    {
        // Nunca usamos el nombre que envía el cliente: generamos uno propio.
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{ext}";
        var userDir = Path.Combine(_root, userId.ToString("N"));
        Directory.CreateDirectory(userDir);

        await using var stream = File.Create(Path.Combine(userDir, fileName));
        await file.CopyToAsync(stream, ct);

        return $"{RequestPath}/{userId:N}/{fileName}";
    }

    public string GetUrl(string key) => key; // ya es una ruta relativa: /uploads/...

    public Task DeleteAsync(string url, CancellationToken ct = default)
    {
        if (!url.StartsWith(RequestPath + "/", StringComparison.Ordinal)) return Task.CompletedTask;

        var relative = url[(RequestPath.Length + 1)..].Replace('/', Path.DirectorySeparatorChar);
        var full = Path.GetFullPath(Path.Combine(_root, relative));

        // Protección contra rutas tipo "../.." : solo borramos dentro de /uploads
        if (!full.StartsWith(Path.GetFullPath(_root) + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            return Task.CompletedTask;
        if (File.Exists(full)) File.Delete(full);
        return Task.CompletedTask;
    }
}
