/**
 * Service for interacting with the OpenWeather API
 */

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';


export interface WeatherData {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
  sea_level?: number;
  grnd_level?: number;
  temp_kf?: number;
}

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface WeatherResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: WeatherCondition[];
  base: string;
  main: WeatherData;
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type?: number;
    id?: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  snow?: {
    '1h'?: number;
    '3h'?: number;
  };
}

export interface ForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: Array<{
    dt: number;
    main: WeatherData & {
      temp_kf: number;
    };
    weather: WeatherCondition[];
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
      deg: number;
      gust?: number;
    };
    visibility: number;
    pop: number;
    rain?: {
      '3h': number;
    };
    snow?: {
      '3h': number;
    };
    sys: {
      pod: string;
    };
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

// Check if the weather is good for a picnic
export function isGoodWeatherForPicnic(weatherData: WeatherResponse): boolean {
  const { main, weather } = weatherData;
  const mainWeather = weather[0]?.main.toLowerCase();
  const temp = main.temp - 273.15; // Convert from Kelvin to Celsius
  
  // Check for bad weather conditions
  const badWeather = [
    'thunderstorm',
    'drizzle',
    'rain',
    'snow',
    'tornado',
    'squall',
    'ash',
    'dust',
    'sand',
    'fog',
    'haze',
    'smoke',
    'mist',
  ];
  
  // Check if current weather is in the bad weather list
  const isBadWeather = badWeather.some(condition => 
    mainWeather.includes(condition)
  );
  
  // Check temperature range (10°C to 30°C is considered good for picnic)
  const isGoodTemperature = temp >= 10 && temp <= 30;
  
  // Check wind speed (less than 20 m/s is acceptable)
  const isGoodWind = weatherData.wind.speed < 20;
  
  // Check visibility (more than 1000m is acceptable)
  const isGoodVisibility = weatherData.visibility > 1000;
  
  return !isBadWeather && isGoodTemperature && isGoodWind && isGoodVisibility;
}

// Get weather data for a specific location
export async function getWeatherData(lat: number, lon: number, unit: 'metric' | 'imperial' = 'metric'): Promise<WeatherResponse> {
  try {
    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${OPENWEATHER_API_KEY}`
    );
    if (!response.ok) {
      throw new Error(`Weather request failed with status: ${response.status}`);
    }
    const data = await response.json();
    return data as WeatherResponse;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}

// Get weather data by city name
export async function getWeatherByCity(city: string): Promise<WeatherResponse> {
  try {
    const response = await fetch(
      `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Weather request failed with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching weather by city:', error);
    throw error;
  }
}

// Get forecast data for a specific location
export async function getForecast(lat: number, lon: number): Promise<ForecastResponse> {
  try {
    const response = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Forecast request failed with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching forecast:', error);
    throw error;
  }
}

// Get a user-friendly weather description
export function getWeatherDescription(weatherData: WeatherResponse): string {
  const { weather, main, wind } = weatherData;
  const weatherCondition = weather[0]?.description || 'unknown';
  const temperature = Math.round(main.temp);
  
  return `${weatherCondition.charAt(0).toUpperCase() + weatherCondition.slice(1)}, ${temperature}°C, ${main.humidity}% humidity, wind ${wind.speed} m/s`;
}

// Weather condition to emoji mapping with temperature considerations
const WEATHER_EMOJIS: Record<string, { emoji: string | ((temp: number) => string); message: ((temp: number, isCelsius: boolean) => string) | (() => string) }> = {
'clear': {
emoji: (temp: number) => {
if (temp > 30) return '🥵☀️'; // Very hot
if (temp > 25) return '☀️';   // Hot
if (temp > 15) return '😎☀️'; // Warm
if (temp > 5) return '🌤️';   // Cool
return '❄️';                 // Cold
},
message: (temp: number, isCelsius: boolean) => {
if (temp > 30) return isCelsius ? 'Scorching hot! Stay hydrated.' : 'Scorching hot! Stay hydrated.';
if (temp > 25) return isCelsius ? 'Perfect sunny weather for a picnic!' : 'Perfect sunny weather for a picnic!';
if (temp > 15) return isCelsius ? 'Lovely weather to be outside!' : 'Lovely weather to be outside!';
if (temp > 5) return isCelsius ? 'A bit chilly, bring a jacket!' : 'A bit chilly, bring a jacket!';
return isCelsius ? 'Very cold! Dress warmly.' : 'Very cold! Dress warmly.';
}
},
'clouds': {
emoji: (temp: number) => {
if (temp > 25) return '🌤️';
if (temp > 10) return '⛅';
return '☁️';
},
message: (temp: number, isCelsius: boolean) => {
if (temp > 25) return isCelsius ? 'Warm with some clouds. Great picnic weather!' : 'Warm with some clouds. Great picnic weather!';
if (temp > 10) return isCelsius ? 'Mild and cloudy. Still nice out!' : 'Mild and cloudy. Still nice out!';
return isCelsius ? 'Cloudy and cool. Maybe bring a jacket?' : 'Cloudy and cool. Maybe bring a jacket?';
}
},
'rain': {
emoji: () => '🌧️☔',
message: (_temp: number, _isCelsius: boolean) => 'Rainy day. Maybe an indoor picnic?'
},
'drizzle': {
emoji: () => '🌦️',
message: (_temp: number, _isCelsius: boolean) => 'Light rain. Bring an umbrella!'
},
'thunderstorm': {
emoji: () => '⛈️⚡',
message: () => 'Thunderstorms expected. Better stay inside!'
},
'snow': {
emoji: (temp: number) => temp < -5 ? '🥶❄️' : '❄️☃️',
message: (_temp: number, _isCelsius: boolean) => 'Snowy weather. Bundle up if you go out!'
},
'mist': { emoji: () => '🌫️', message: () => 'Misty conditions. Drive carefully!' },
'smoke': { emoji: () => '💨', message: () => 'Smoky air. Consider staying indoors.' },
'haze': { emoji: () => '🌫️', message: () => 'Hazy conditions. Take it easy outside.' },
'dust': { emoji: () => '💨', message: () => 'Dusty conditions. Wear a mask if needed.' },
'fog': { emoji: () => '🌫️', message: () => 'Foggy out. Drive carefully!' },
'sand': { emoji: () => '💨', message: () => 'Sandy conditions. Protect your eyes!' },
'ash': { emoji: () => '🌋', message: () => 'Ash in the air. Stay indoors if possible.' },
'squall': { emoji: () => '💨', message: () => 'Strong winds expected. Be careful outside!' },
};

// Get a weather-based picnic recommendation with emoji
export function getPicnicRecommendation(weatherData: WeatherResponse): { 
  emoji: string; 
  message: string; 
} {
  const { main, weather } = weatherData;
  const mainWeather = (weather[0]?.main || 'Clear').toLowerCase();
  const temp = main.temp;
  
  // Default to Celsius if units not specified
  const isCelsius = !weatherData.sys || !weatherData.sys.country || 
                   weatherData.sys.country !== 'US';
  
  // Get weather handler or default to clear weather
  const weatherHandler = WEATHER_EMOJIS[mainWeather] || WEATHER_EMOJIS['clear'];
  
  // Get emoji and message based on temperature and conditions
  const emoji = typeof weatherHandler.emoji === 'function' 
    ? weatherHandler.emoji(temp) 
    : weatherHandler.emoji;
    
  const message = typeof weatherHandler.message === 'function'
    ? weatherHandler.message(temp, isCelsius)
    : 'Check the weather for today!';
  
  return { emoji, message };
}

// Get a picnic recommendation based on weather conditions
export function getPicnicRecommendationDetailed(weatherData: WeatherResponse): {
  canPicnic: boolean;
  message: string;
  emoji: string;
  temp: number;
  condition: string;
} {
  const { main, weather, wind } = weatherData;
  const mainWeather = (weather[0]?.main || 'Clear').toLowerCase();
  const description = weather[0]?.description || 'unknown';
  const temp = Math.round(main.temp);
  
  // Get the base recommendation
  const { emoji, message } = getPicnicRecommendation(weatherData);
  
  // Check for bad weather conditions
  const badWeatherConditions = [
    { condition: 'thunderstorm', message: '⚡ Thunderstorms expected. Better stay indoors!', maxWind: 0 },
    { condition: 'tornado', message: '🌪️ Tornado warning! Seek shelter immediately!', maxWind: 0 },
    { condition: 'squall', message: '💨 Strong winds expected. Be careful outside!', maxWind: 30 },
    { condition: 'ash', message: '🌋 Ash in the air. Stay indoors if possible.', maxWind: 0 },
    { condition: 'sand', message: '💨 Sandy conditions. Protect your eyes!', maxWind: 0 },
    { condition: 'fog', message: '🌫️ Low visibility due to fog. Be cautious!', maxWind: 0 },
    { condition: 'hail', message: '🌨️ Hail expected. Protect yourself!', maxWind: 0 },
    { condition: 'smoke', message: '💨 Poor air quality. Consider staying indoors.', maxWind: 0 },
    { condition: 'dust', message: '💨 Dusty conditions. Protect your eyes and nose!', maxWind: 0 },
    { condition: 'snow', message: '❄️ Snowy conditions. Bundle up!', maxWind: 15 },
    { condition: 'rain', message: '🌧️ Rainy weather. Bring an umbrella!', maxWind: 20 },
    { condition: 'drizzle', message: '🌧️ Drizzly weather. Light rain expected.', maxWind: 20 }
  ];

  // Check if current weather matches any bad conditions
  const badWeatherMatch = badWeatherConditions.find(w => 
    mainWeather.includes(w.condition) || 
    description.includes(w.condition)
  );

  // Check wind conditions
  const windSpeed = wind?.speed || 0;
  const isWindy = badWeatherMatch && badWeatherMatch.maxWind > 0 && windSpeed > badWeatherMatch.maxWind;

  // Determine if picnic is possible
  const canPicnic = !badWeatherMatch || !isWindy;
  
  // Use the appropriate message
  const finalMessage = canPicnic 
    ? message 
    : badWeatherMatch?.message || message;

  // Check wind speed
  if (wind.speed > 10) {
    return {
      canPicnic: false,
      message: `💨 Too windy (${wind.speed} m/s) - your food might fly away!`,
      emoji: '💨',
      temp,
      condition: 'Windy'
    };
  }

  // If all checks pass, return the appropriate message based on conditions
  // Format the condition for display (capitalize first letter of each word)
  const formattedCondition = description
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    canPicnic: true,
    message: finalMessage,
    emoji,
    temp,
    condition: formattedCondition
  };
}
