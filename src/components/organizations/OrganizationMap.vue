<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { OrganizationPreview } from '../../types'

const props = withDefaults(defineProps<{
  organizations?: OrganizationPreview[]
  interactive?: boolean
  latitude?: number | null
  longitude?: number | null
}>(), {
  organizations: () => [],
  interactive: false,
  latitude: null,
  longitude: null,
})

const emit = defineEmits<{
  select: [organization: OrganizationPreview]
  'location-change': [location: { latitude: number; longitude: number }]
}>()

const mapElement = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let markerLayer: L.LayerGroup | null = null
let pickerMarker: L.Marker | null = null

const defaultCenter: L.LatLngExpression = [41.9, 12.5]

function markerIcon(kind: 'organization' | 'picker'): L.DivIcon {
  return L.divIcon({
    className: `organization-map-marker organization-map-marker--${kind}`,
    html: '<span></span>',
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -32],
  })
}

function hasCoordinates(organization: OrganizationPreview): boolean {
  return typeof organization.latitude === 'number' && typeof organization.longitude === 'number'
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}

function renderMarkers(): void {
  if (!map || !markerLayer) return
  markerLayer.clearLayers()
  const bounds: L.LatLngExpression[] = []

  for (const organization of props.organizations) {
    if (!hasCoordinates(organization)) continue
    const position: L.LatLngExpression = [organization.latitude!, organization.longitude!]
    L.marker(position, { icon: markerIcon('organization') })
      .bindPopup(`<strong>${escapeHtml(organization.name)}</strong><br>${escapeHtml(organization.city ?? 'Organizzazione pubblica')}`)
      .on('click', () => emit('select', organization))
      .addTo(markerLayer)
    bounds.push(position)
  }

  if (bounds.length > 0 && !props.interactive) {
    map.fitBounds(L.latLngBounds(bounds), { padding: [28, 28], maxZoom: 12 })
  }
}

function renderPicker(): void {
  if (!map) return
  pickerMarker?.remove()
  pickerMarker = null
  if (typeof props.latitude !== 'number' || typeof props.longitude !== 'number') return
  pickerMarker = L.marker([props.latitude, props.longitude], { icon: markerIcon('picker') }).addTo(map)
  if (props.interactive) map.panTo([props.latitude, props.longitude])
}

onMounted(() => {
  if (!mapElement.value) return
  map = L.map(mapElement.value).setView(defaultCenter, 6)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)
  markerLayer = L.layerGroup().addTo(map)
  if (props.interactive) {
    map.on('click', event => emit('location-change', { latitude: event.latlng.lat, longitude: event.latlng.lng }))
  }
  renderMarkers()
  renderPicker()
})

watch(() => props.organizations, renderMarkers, { deep: true })
watch(() => [props.latitude, props.longitude], renderPicker)

onBeforeUnmount(() => {
  map?.remove()
  map = null
  markerLayer = null
  pickerMarker = null
})
</script>

<template>
  <div ref="mapElement" class="organization-map" :class="{ 'organization-map--interactive': interactive }" role="region" aria-label="Mappa delle organizzazioni" />
</template>

<style>
.organization-map { min-height: 360px; overflow: hidden; border: 1px solid var(--color-border); background: var(--color-surface-soft); }
.organization-map--interactive { min-height: 250px; cursor: crosshair; }
.organization-map .leaflet-control-attribution { font-size: 9px; }
.organization-map-marker { position: relative; display: grid; width: 26px !important; height: 34px !important; place-items: center; border: 0; background: transparent; }
.organization-map-marker::before { position: absolute; width: 24px; height: 24px; border: 3px solid var(--color-white); border-radius: 50% 50% 50% 0; background: var(--color-primary-700); box-shadow: 0 3px 10px rgb(var(--color-shadow-rgb) / 22%); content: ''; transform: rotate(-45deg); }
.organization-map-marker span { position: relative; z-index: 1; width: 7px; height: 7px; border-radius: 50%; background: var(--color-accent); }
.organization-map-marker--picker::before { background: var(--color-accent); }
.organization-map-marker--picker span { background: var(--color-primary-800); }
@media (max-width: 680px) { .organization-map { min-height: 300px; } .organization-map--interactive { min-height: 220px; } }
</style>
