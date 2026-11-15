using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace ColombiaTravel.Api.Services;

public class StorageOptions
{
    public const string SectionName = "Storage";

    public string ServiceUrl { get; set; } = string.Empty; // endpoint S3 de Neon
    public string Region { get; set; } = "us-east-2";
    public string Bucket { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public int UrlExpiryMinutes { get; set; } = 60;
}

/// <summary>
/// Guarda las fotos en un bucket S3-compatible (Neon Object Storage).
/// El bucket es privado: en la BD se guarda la llave y al responder se genera una URL temporal firmada.
/// </summary>
public class S3PhotoStorage : IPhotoStorage
{
    private readonly StorageOptions _o;
    private readonly AmazonS3Client _s3;

    public S3PhotoStorage(IOptions<StorageOptions> options)
    {
        _o = options.Value;
        if (string.IsNullOrWhiteSpace(_o.Bucket) || string.IsNullOrWhiteSpace(_o.AccessKey) || string.IsNullOrWhiteSpace(_o.SecretKey))
            throw new InvalidOperationException("Faltan Storage:Bucket, Storage:AccessKey o Storage:SecretKey.");

        var config = new AmazonS3Config
        {
            ServiceURL = _o.ServiceUrl,
            AuthenticationRegion = _o.Region,
            ForcePathStyle = true, // Neon solo soporta direcciones tipo path-style
            // Los servicios "compatibles con S3" no siempre aceptan los checksums extra del SDK nuevo
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED
        };
        _s3 = new AmazonS3Client(new BasicAWSCredentials(_o.AccessKey, _o.SecretKey), config);
    }

    public async Task<string> SaveAsync(Guid userId, IFormFile file, CancellationToken ct)
    {
        var key = $"{userId:N}/{Guid.NewGuid():N}{Path.GetExtension(file.FileName).ToLowerInvariant()}";

        await using var stream = file.OpenReadStream();
        await _s3.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _o.Bucket,
            Key = key,
            InputStream = stream,
            ContentType = file.ContentType
        }, ct);

        return key;
    }

    public string GetUrl(string key) =>
        _s3.GetPreSignedURL(new GetPreSignedUrlRequest
        {
            BucketName = _o.Bucket,
            Key = key,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddMinutes(_o.UrlExpiryMinutes)
        });

    public async Task DeleteAsync(string key, CancellationToken ct = default) =>
        await _s3.DeleteObjectAsync(_o.Bucket, key, ct);
}
