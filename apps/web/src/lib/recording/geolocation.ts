export type GeoPositionCallback = (position: GeolocationPosition) => void;
export type GeoErrorCallback = (error: GeolocationPositionError) => void;

export class GeolocationService {
  public isSupported(): boolean {
    return typeof window !== "undefined" && "geolocation" in navigator;
  }

  public watchPosition(onSuccess: GeoPositionCallback, onError: GeoErrorCallback): number | null {
    if (!this.isSupported()) {
      return null;
    }

    return navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10_000,
    });
  }

  public clearWatch(watchId: number): void {
    if (this.isSupported()) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  public getErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Permiso de ubicación denegado. Permite el acceso al GPS en tu navegador para grabar la carrera.";
      case error.POSITION_UNAVAILABLE:
        return "Señal de GPS no disponible. Asegúrate de estar al aire libre con buena cobertura.";
      case error.TIMEOUT:
        return "Buscando satélites GPS... Tardó en responder la señal.";
      default:
        return "Ocurrió un error al obtener la ubicación.";
    }
  }
}

export const geolocationService = new GeolocationService();
