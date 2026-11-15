namespace ColombiaTravel.Api.Dtos;

/// <summary>Un viaje con sus fotos (una "tarjeta" del muro de Recuerdos).</summary>
public record MemoryTripDto(
    Guid TripId,
    string Label,
    DateOnly TripDate,
    string MunicipalityId,
    string MunicipalityName,
    string DepartmentId,
    string DepartmentName,
    List<PhotoDto> Photos);

public record DepartmentOptionDto(string Id, string Name);

public record MemoriesDto(
    int TotalPhotos,
    int TotalMunicipalities,
    List<DepartmentOptionDto> Departments, // para los botones de filtro
    List<MemoryTripDto> Trips);            // viajes con fotos, del más reciente al más antiguo
