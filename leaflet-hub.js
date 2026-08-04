/**
 * 原型统一地图：Leaflet + Carto dark（免 Key）
 * 与 camera-list / 告警详情一致。
 */
(function (global) {
  var TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  var TILE_IMG = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  var DEFAULT = { lat: 22.573123, lng: 113.945231, zoom: 16 };

  function addDarkTiles(map) {
    return L.tileLayer(TILE_DARK, { maxZoom: 20, subdomains: 'abcd' }).addTo(map);
  }

  function addImgTiles(map) {
    return L.tileLayer(TILE_IMG, { maxZoom: 19 }).addTo(map);
  }

  function pinIcon(color) {
    color = color || '#58a6ff';
    return L.divIcon({
      className: '',
      html: '<i class="fas fa-map-marker-alt" style="color:' + color + ';font-size:28px;text-shadow:0 1px 4px rgba(0,0,0,.6);"></i>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -24]
    });
  }

  function createMap(elId, opts) {
    opts = opts || {};
    var map = L.map(elId, {
      zoomControl: opts.zoomControl !== false,
      attributionControl: !!opts.attributionControl,
      dragging: opts.dragging !== false,
      scrollWheelZoom: opts.scrollWheelZoom !== false,
      doubleClickZoom: opts.doubleClickZoom !== false,
      boxZoom: opts.boxZoom !== false,
      keyboard: opts.keyboard !== false
    });
    var center = opts.center || [DEFAULT.lat, DEFAULT.lng];
    var zoom = opts.zoom != null ? opts.zoom : DEFAULT.zoom;
    map.setView(center, zoom);
    if (opts.imagery) addImgTiles(map);
    else addDarkTiles(map);
    return map;
  }

  /** 选点弹窗：点击/拖拽标记 ↔ 经纬度输入 */
  function createPicker(mapElId, lngInputId, latInputId) {
    var map = null;
    var marker = null;
    var syncing = false;

    function ensure() {
      if (map) return map;
      map = createMap(mapElId, { zoomControl: true, attributionControl: false });
      marker = L.marker([DEFAULT.lat, DEFAULT.lng], { icon: pinIcon('#58a6ff'), draggable: true }).addTo(map);
      marker.on('dragend', function () {
        var ll = marker.getLatLng();
        writeInputs(ll.lng, ll.lat);
      });
      map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        writeInputs(e.latlng.lng, e.latlng.lat);
      });
      return map;
    }

    function writeInputs(lng, lat) {
      syncing = true;
      var lngEl = document.getElementById(lngInputId);
      var latEl = document.getElementById(latInputId);
      if (lngEl) lngEl.value = Number(lng).toFixed(6);
      if (latEl) latEl.value = Number(lat).toFixed(6);
      syncing = false;
    }

    function readInputs() {
      var lng = parseFloat((document.getElementById(lngInputId) || {}).value);
      var lat = parseFloat((document.getElementById(latInputId) || {}).value);
      if (isNaN(lng) || isNaN(lat)) return null;
      return { lng: lng, lat: lat };
    }

    function openAt(lng, lat, zoom) {
      ensure();
      var ll = {
        lng: isNaN(parseFloat(lng)) ? DEFAULT.lng : parseFloat(lng),
        lat: isNaN(parseFloat(lat)) ? DEFAULT.lat : parseFloat(lat)
      };
      writeInputs(ll.lng, ll.lat);
      marker.setLatLng([ll.lat, ll.lng]);
      map.setView([ll.lat, ll.lng], zoom != null ? zoom : 16);
      setTimeout(function () { map.invalidateSize(); }, 80);
    }

    function syncFromInputs() {
      if (syncing || !map || !marker) return;
      var ll = readInputs();
      if (!ll) return;
      marker.setLatLng([ll.lat, ll.lng]);
      map.panTo([ll.lat, ll.lng]);
    }

    return { ensure: ensure, openAt: openAt, syncFromInputs: syncFromInputs, readInputs: readInputs, getMap: function () { return map; } };
  }

  /** 只读查看：固定点 */
  function createViewer(mapElId) {
    var map = null;
    var marker = null;
    function openAt(lng, lat) {
      var ll = {
        lng: isNaN(parseFloat(lng)) ? DEFAULT.lng : parseFloat(lng),
        lat: isNaN(parseFloat(lat)) ? DEFAULT.lat : parseFloat(lat)
      };
      if (!map) {
        map = createMap(mapElId, {
          zoomControl: true,
          attributionControl: false,
          dragging: true,
          scrollWheelZoom: true
        });
        marker = L.marker([ll.lat, ll.lng], { icon: pinIcon('#f85149') }).addTo(map);
      } else {
        marker.setLatLng([ll.lat, ll.lng]);
        map.setView([ll.lat, ll.lng], 16);
      }
      setTimeout(function () { map.invalidateSize(); }, 80);
    }
    return { openAt: openAt, getMap: function () { return map; } };
  }

  /** 内嵌预览小地图 */
  function createInline(mapElId, opts) {
    opts = opts || {};
    var map = createMap(mapElId, {
      zoomControl: false,
      attributionControl: false,
      dragging: !!opts.interactive,
      scrollWheelZoom: !!opts.interactive,
      doubleClickZoom: !!opts.interactive,
      center: opts.center,
      zoom: opts.zoom != null ? opts.zoom : 15
    });
    var marker = null;
    if (opts.lat != null && opts.lng != null) {
      marker = L.marker([opts.lat, opts.lng], { icon: pinIcon(opts.color || '#f85149') }).addTo(map);
    }
    setTimeout(function () { map.invalidateSize(); }, 80);
    return {
      map: map,
      setPoint: function (lat, lng) {
        if (!marker) marker = L.marker([lat, lng], { icon: pinIcon(opts.color || '#f85149') }).addTo(map);
        else marker.setLatLng([lat, lng]);
        map.setView([lat, lng], map.getZoom());
      },
      invalidate: function () { map.invalidateSize(); }
    };
  }

  global.HubMap = {
    TILE_DARK: TILE_DARK,
    TILE_IMG: TILE_IMG,
    DEFAULT: DEFAULT,
    addDarkTiles: addDarkTiles,
    addImgTiles: addImgTiles,
    pinIcon: pinIcon,
    createMap: createMap,
    createPicker: createPicker,
    createViewer: createViewer,
    createInline: createInline
  };
})(window);
