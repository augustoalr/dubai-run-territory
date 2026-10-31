"use client";

export function MapLegend() {
  return (
    <aside className="map-legend-card glass" aria-label="Leyenda de estados del territorio">
      <div className="legend-items">
        <div className="legend-item" title="Territorio que posees actualmente">
          <span className="swatch-indicator swatch-mine" />
          <span className="legend-label">Mía</span>
        </div>

        <div className="legend-item" title="Territorio tuyo con un rival muy cerca">
          <span className="swatch-indicator swatch-threatened">
            <span className="pulse-halo" />
          </span>
          <span className="legend-label">En peligro</span>
        </div>

        <div className="legend-item" title="Territorio dominado por otro corredor">
          <span className="swatch-indicator swatch-rival" />
          <span className="legend-label">De otro</span>
        </div>

        <div className="legend-item" title="Territorio disponible para conquistar">
          <span className="swatch-indicator swatch-free" />
          <span className="legend-label">Libre</span>
        </div>
      </div>
    </aside>
  );
}
