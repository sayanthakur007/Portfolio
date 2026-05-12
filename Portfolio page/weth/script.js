const state = {
  unit: "metric",
  locationLabel: "",
  timezone: "",
  lastWeatherData: null,
};

const els = {
  cityInput: document.getElementById("cityInput"),
  searchForm: document.getElementById("searchForm"),
  locationBtn: document.getElementById("locationBtn"),
  metricBtn: document.getElementById("metricBtn"),
  imperialBtn: document.getElementById("imperialBtn"),
  lastUpdated: document.getElementById("lastUpdated"),
  currentIcon: document.getElementById("currentIcon"),
  currentTemp: document.getElementById("currentTemp"),
  currentSummary: document.getElementById("currentSummary"),
  locationHeading: document.getElementById("locationHeading"),
  subHeading: document.getElementById("subHeading"),
  apparentTemp: document.getElementById("apparentTemp"),
  windSpeed: document.getElementById("windSpeed"),
  humidity: document.getElementById("humidity"),
  visibility: document.getElementById("visibility"),
  uvIndex: document.getElementById("uvIndex"),
  precipitation: document.getElementById("precipitation"),
  hourlyList: document.getElementById("hourlyList"),
  dailyList: document.getElementById("dailyList"),
  hourlyCaption: document.getElementById("hourlyCaption"),
  dailyCaption: document.getElementById("dailyCaption"),
  comfortLabel: document.getElementById("comfortLabel"),
  comfortCopy: document.getElementById("comfortCopy"),
  rainChance: document.getElementById("rainChance"),
  rainBar: document.getElementById("rainBar"),
  windDirection: document.getElementById("windDirection"),
  windDirectionCopy: document.getElementById("windDirectionCopy"),
  messageBox: document.getElementById("messageBox"),
};

const weatherCodes = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Depositing rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  56: { label: "Freezing drizzle", icon: "🌧️" },
  57: { label: "Heavy freezing drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌦️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Freezing rain", icon: "🌧️" },
  67: { label: "Heavy freezing rain", icon: "🌧️" },
  71: { label: "Slight snow", icon: "🌨️" },
  73: { label: "Moderate snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Heavy rain showers", icon: "🌧️" },
  82: { label: "Violent rain showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Severe thunderstorm", icon: "⛈️" },
};

function setMessage(text = "", isVisible = false) {
  els.messageBox.textContent = text;
  els.messageBox.classList.toggle("show", isVisible);
}

function setLoading(copy) {
  els.lastUpdated.textContent = copy;
}

function getWeatherMeta(code) {
  return weatherCodes[code] || { label: "Unknown weather", icon: "🌍" };
}

function formatTemperature(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const temp = state.unit === "metric" ? value : (value * 9) / 5 + 32;
  return `${Math.round(temp)}°${state.unit === "metric" ? "C" : "F"}`;
}

function formatWind(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const speed = state.unit === "metric" ? value : value / 1.609;
  return `${Math.round(speed)} ${state.unit === "metric" ? "km/h" : "mph"}`;
}

function formatDistance(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const distance = state.unit === "metric" ? value : value * 0.621;
  return `${Math.round(distance)} ${state.unit === "metric" ? "km" : "mi"}`;
}

function formatPrecipitation(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const amount = state.unit === "metric" ? value : value / 25.4;
  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${state.unit === "metric" ? "mm" : "in"}`;
}

function formatTime(timestamp, options) {
  return new Intl.DateTimeFormat("en-US", options).format(new Date(timestamp));
}

function formatHourLabel(isoString) {
  const [, time = ""] = isoString.split("T");
  const [hourText = "0", minute = "00"] = time.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${minute} ${suffix}`;
}

function formatDayLabel(isoString) {
  return formatTime(`${isoString}T00:00:00`, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getDirectionLabel(degrees) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
}

function getComfortLabel(tempC, humidity, windKmh) {
  if (tempC >= 31) {
    return ["Heat alert", "Warm and muggy conditions. Stay hydrated and seek shade when possible."];
  }

  if (tempC <= 8) {
    return ["Chilly air", "Cool conditions with a crisp feel. A layer or jacket will help."];
  }

  if (humidity >= 80) {
    return ["Sticky humidity", "Moisture levels are high, so it may feel heavier than the actual temperature."];
  }

  if (windKmh >= 28) {
    return ["Breezy stretch", "Stronger winds will make the air feel brisk, especially in open areas."];
  }

  return ["Comfortable", "The current mix of temperature, humidity, and wind should feel pleasant for most people."];
}

async function searchLocation(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Location search failed.");
  }

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("No matching locations were found.");
  }

  return data.results[0];
}

async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(","),
    hourly: [
      "temperature_2m",
      "weather_code",
      "precipitation_probability",
      "uv_index",
      "visibility",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
    ].join(","),
    forecast_days: 7,
    timezone: "auto",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather lookup failed.");
  }

  return response.json();
}

function renderHourly(data) {
  const currentTime = new Date(data.current.time).getTime();
  const hourlyCards = [];

  for (let i = 0; i < data.hourly.time.length; i += 1) {
    const time = new Date(data.hourly.time[i]).getTime();
    if (time >= currentTime) {
      hourlyCards.push({
        time: data.hourly.time[i],
        temperature: data.hourly.temperature_2m[i],
        weatherCode: data.hourly.weather_code[i],
        rainChance: data.hourly.precipitation_probability[i],
      });
    }

    if (hourlyCards.length === 6) {
      break;
    }
  }

  els.hourlyList.innerHTML = hourlyCards.map((entry, index) => {
    const meta = getWeatherMeta(entry.weatherCode);
    return `
      <article class="forecast-card" style="animation-delay:${index * 80}ms;">
        <div class="time">${formatHourLabel(entry.time)}</div>
        <div class="icon">${meta.icon}</div>
        <div class="temp">${formatTemperature(entry.temperature)}</div>
        <div class="detail">${entry.rainChance}% rain chance</div>
      </article>
    `;
  }).join("");
}

function renderDaily(data) {
  els.dailyList.innerHTML = data.daily.time.map((day, index) => {
    const meta = getWeatherMeta(data.daily.weather_code[index]);
    return `
      <article class="forecast-card">
        <div>
          <div class="date">${formatDayLabel(day)}</div>
          <div class="detail">${meta.label}</div>
        </div>
        <div class="icon" aria-hidden="true">${meta.icon}</div>
        <div class="daily-temps">
          <span>${formatTemperature(data.daily.temperature_2m_max[index])}</span>
          <span class="muted-temp">${formatTemperature(data.daily.temperature_2m_min[index])}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderWeather(data) {
  state.timezone = data.timezone;
  state.lastWeatherData = data;

  const current = data.current;
  const currentMeta = getWeatherMeta(current.weather_code);
  const currentHourIndex = data.hourly.time.indexOf(current.time);
  const visibilityMeters = currentHourIndex >= 0 ? data.hourly.visibility[currentHourIndex] : null;
  const visibilityKm = visibilityMeters !== null ? visibilityMeters / 1000 : null;
  const uvIndex = currentHourIndex >= 0 ? data.hourly.uv_index[currentHourIndex] : null;
  const rainChance = currentHourIndex >= 0 ? data.hourly.precipitation_probability[currentHourIndex] : 0;
  const [comfortTitle, comfortText] = getComfortLabel(
    current.temperature_2m,
    current.relative_humidity_2m,
    current.wind_speed_10m
  );

  els.currentIcon.textContent = currentMeta.icon;
  els.currentTemp.textContent = formatTemperature(current.temperature_2m);
  els.currentSummary.textContent = `${currentMeta.label} • Feels like ${formatTemperature(current.apparent_temperature)}`;
  els.subHeading.textContent = `Timezone: ${data.timezone.replace("_", " ")} • Coordinates ${Number(data.latitude).toFixed(2)}, ${Number(data.longitude).toFixed(2)}`;
  els.apparentTemp.textContent = formatTemperature(current.apparent_temperature);
  els.windSpeed.textContent = formatWind(current.wind_speed_10m);
  els.humidity.textContent = `${current.relative_humidity_2m}%`;
  els.visibility.textContent = formatDistance(visibilityKm);
  els.uvIndex.textContent = uvIndex !== null ? uvIndex.toFixed(1) : "--";
  els.precipitation.textContent = formatPrecipitation(current.precipitation);
  els.comfortLabel.textContent = comfortTitle;
  els.comfortCopy.textContent = comfortText;
  els.rainChance.textContent = `${rainChance}%`;
  els.rainBar.style.width = `${Math.max(6, rainChance)}%`;
  els.windDirection.textContent = `${getDirectionLabel(current.wind_direction_10m)} • ${Math.round(current.wind_direction_10m)}°`;
  els.windDirectionCopy.textContent = `Wind is currently moving toward the ${getDirectionLabel(current.wind_direction_10m)} quadrant.`;
  els.lastUpdated.textContent = `Updated ${formatHourLabel(current.time)} on ${formatDayLabel(current.time.split("T")[0])}`;
  els.hourlyCaption.textContent = `Next 6 hours in ${state.locationLabel}`;
  els.dailyCaption.textContent = `This week in ${state.locationLabel}`;

  renderHourly(data);
  renderDaily(data);
}

async function loadWeatherByCoordinates(latitude, longitude, label) {
  setMessage("", false);
  setLoading("Refreshing weather...");

  try {
    state.locationLabel = label;
    els.locationHeading.textContent = label;
    const data = await fetchWeather(latitude, longitude);
    renderWeather(data);
  } catch (error) {
    setLoading("Unable to refresh weather");
    setMessage(error.message || "Something went wrong while loading the weather.", true);
  }
}

async function handleCitySearch(query) {
  if (!query.trim()) {
    setMessage("Enter a city or location to search for weather.", true);
    return;
  }

  setLoading("Finding location...");
  setMessage("", false);

  try {
    const result = await searchLocation(query.trim());
    const label = [result.name, result.admin1, result.country].filter(Boolean).join(", ");
    await loadWeatherByCoordinates(result.latitude, result.longitude, label);
  } catch (error) {
    setLoading("Location search failed");
    setMessage(error.message || "Unable to find that location.", true);
  }
}

function syncUnitButtons() {
  const isMetric = state.unit === "metric";
  els.metricBtn.classList.toggle("active", isMetric);
  els.imperialBtn.classList.toggle("active", !isMetric);
}

function updateUnit(unit) {
  if (state.unit === unit) {
    return;
  }

  state.unit = unit;
  syncUnitButtons();

  if (state.lastWeatherData) {
    renderWeather(state.lastWeatherData);
  }
}

els.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleCitySearch(els.cityInput.value);
});

els.locationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setMessage("Geolocation is not supported by this browser.", true);
    return;
  }

  setLoading("Requesting your location...");
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      await loadWeatherByCoordinates(coords.latitude, coords.longitude, "Your current location");
    },
    () => {
      setLoading("Location permission denied");
      setMessage("Location access was denied, so search for a city instead.", true);
    }
  );
});

els.metricBtn.addEventListener("click", () => updateUnit("metric"));
els.imperialBtn.addEventListener("click", () => updateUnit("imperial"));

handleCitySearch("Kolkata");
