import React, {useState, useEffect} from 'react'

// AgriAI Prototype - Single-file React component
// Uses Tailwind CSS utility classes (assumes Tailwind is configured in the project)
// This is a functional UI prototype demonstrating:
//  - Login page with regional language switch
//  - Dashboard showing yield predictions, recommendations, real-time data (mocked)
//  - Data visualizations (simple charts) and accessibility features
//  - Clear placeholders where ML APIs and real sensors / weather APIs should be integrated

// NOTE: This file is meant as a frontend prototype. Replace mocked fetch endpoints
// with your backend endpoints (/api/predict, /api/weather, /api/soil, /api/recommendations)

export default function AgriAIPrototype(){
  const [user, setUser] = useState(null)
  const [language, setLanguage] = useState('en') // 'en', 'hi', 'mr', 'bn', etc.
  const [loading, setLoading] = useState(false)
  const [farm, setFarm] = useState({name: '', crop: 'wheat', areaHa: 1})
  const [prediction, setPrediction] = useState(null)
  const [weather, setWeather] = useState(null)
  const [soil, setSoil] = useState(null)
  const [recommendations, setRecommendations] = useState([])

  // simple localization map (replace with i18next for production)
  const t = (k) => {
    const dict = {
      en: {
        login: 'Login', username: 'Phone or ID', enter: 'Enter', selectLang: 'Language',
        predict: 'Predict Yield', dashboard: 'Dashboard', welcome: 'Welcome',
        yield: 'Predicted Yield (tonnes)', recs: 'Recommendations', weather: 'Weather', soil: 'Soil',
        irrigation: 'Irrigation', fertilizer: 'Fertilizer', pest: 'Pest Control'
      },
      hi: {
        login: 'लॉगिन', username: 'फोन या आईडी', enter: 'प्रविष्ट करें', selectLang: 'भाषा',
        predict: 'उपज अनुमान', dashboard: 'डैशबोर्ड', welcome: 'स्वागत है',
        yield: 'अनुमानित उपज (टन)', recs: 'सिफारिशें', weather: 'मौसम', soil: 'मिट्टी',
        irrigation: 'सिंचाई', fertilizer: 'उर्वरक', pest: 'कीट नियंत्रण'
      }
    }
    return (dict[language] && dict[language][k]) || dict['en'][k] || k
  }

  useEffect(()=>{
    if(user){
      fetchAllData()
    }
  }, [user, farm])

  const fetchAllData = async ()=>{
    setLoading(true)
    try{
      // In production replace these with real API calls
      // e.g., /api/weather?lat=..&lon=.. , /api/soil?plotId=.. , /api/predict

      // Mock weather
      const mockWeather = {tempC: 29, rainNext7DaysMm: 12, condition: 'Partly Cloudy'}
      setWeather(mockWeather)

      // Mock soil metrics
      const mockSoil = {ph: 6.5, organicMatterPct: 1.8, moisturePct: 24}
      setSoil(mockSoil)

      // Mock ML prediction call
      const mockPrediction = await fakePredictAPI({crop: farm.crop, areaHa: farm.areaHa, soil: mockSoil, weather: mockWeather})
      setPrediction(mockPrediction)

      // Mock recommendations
      const mockRecs = generateRecommendations(farm.crop, mockSoil, mockWeather)
      setRecommendations(mockRecs)

    }catch(err){
      console.error(err)
    }finally{
      setLoading(false)
    }
  }

  // Mocked prediction - replace with POST /api/predict body {features...}
  const fakePredictAPI = async (features)=>{
    // quick deterministic mock: base yield depends on crop and rainfall
    await new Promise(r=>setTimeout(r,600))
    const baseByCrop = {wheat: 3.2, rice: 4.0, maize: 5.0}
    const base = baseByCrop[features.crop] || 2.5
    const moistureFactor = Math.max(0.8, Math.min(1.2, 0.5 + features.soil.moisturePct/50))
    const phFactor = 1 - Math.abs(6.5 - features.soil.ph)/10
    const weatherFactor = 1 - Math.min(0.3, Math.abs(features.weather.tempC - 25)/50)
    const predictedYieldTons = +(base * moistureFactor * phFactor * weatherFactor * features.areaHa).toFixed(2)
    return {yieldTons: predictedYieldTons, confidence: 0.82}
  }

  const generateRecommendations = (crop, soil, weather)=>{
    const recs = []
    // irrigation advice (simple rule)
    if(soil.moisturePct < 20) recs.push({type: 'irrigation', msg: 'Apply 20mm irrigation in next 3 days'})
    else recs.push({type:'irrigation', msg: 'Soil moisture sufficient for 5 days'})
    // fertilizer simple rule
    if(soil.organicMatterPct < 2) recs.push({type:'fertilizer', msg: 'Apply 30kg/ha organic compost'})
    // pest control placeholder
    recs.push({type:'pest', msg: 'Monitor for aphids — set up yellow sticky traps'})
    return recs
  }

  // Simple login form
  const Login = ()=> (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white">
      <div className="w-full max-w-md p-6 rounded-2xl shadow-lg bg-white">
        <h2 className="text-2xl font-semibold mb-4">{t('login')}</h2>
        <label className="block mb-2 text-sm">{t('username')}</label>
        <input aria-label="username" className="w-full border rounded p-2 mb-4" value={user?user.id:''} onChange={(e)=>{setUser({id:e.target.value})}} />
        <div className="flex items-center justify-between mb-4">
          <select aria-label="language-select" value={language} onChange={(e)=>setLanguage(e.target.value)} className="border px-2 py-1 rounded">
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="mr">मराठी</option>
            <option value="bn">বাংলা</option>
          </select>
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={()=>{ if(user && user.id) setUser({...user, name: 'Farmer ' + user.id}) }}>
            {t('enter')}
          </button>
        </div>
        <div className="text-xs text-gray-500">Accessible: large text, multilingual, works offline (PWA-ready)</div>
      </div>
    </div>
  )

  const Dashboard = ()=> (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
          <div className="text-sm text-gray-600">{t('welcome')} {user && user.name}</div>
        </div>
        <div className="flex items-center gap-3">
          <select value={language} onChange={(e)=>setLanguage(e.target.value)} className="border rounded p-1">
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="mr">मराठी</option>
            <option value="bn">বাংলা</option>
          </select>
          <button className="px-3 py-1 border rounded" onClick={()=>setUser(null)}>Logout</button>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Inputs + quick actions */}
        <section className="md:col-span-1 bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Farm Details</h2>
          <label className="block text-sm">Farm name</label>
          <input className="w-full border rounded p-2 mb-2" value={farm.name} onChange={(e)=>setFarm({...farm, name:e.target.value})} />
          <label className="block text-sm">Crop</label>
          <select value={farm.crop} onChange={(e)=>setFarm({...farm, crop:e.target.value})} className="w-full border rounded p-2 mb-2">
            <option value="wheat">Wheat</option>
            <option value="rice">Rice</option>
            <option value="maize">Maize</option>
            <option value="cotton">Cotton</option>
          </select>
          <label className="block text-sm">Area (ha)</label>
          <input type="number" step="0.1" className="w-full border rounded p-2 mb-4" value={farm.areaHa} onChange={(e)=>setFarm({...farm, areaHa:parseFloat(e.target.value)})} />
          <button className="w-full bg-blue-600 text-white p-2 rounded" onClick={fetchAllData}>{t('predict')}</button>

          <div className="mt-4 text-xs text-gray-500">Designed for low literacy: large buttons, clear labels, optional audio guidance.</div>
        </section>

        {/* Middle column: Predictions and charts */}
        <section className="md:col-span-2 bg-white p-4 rounded shadow">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{t('yield')}</h3>
              {loading && <div className="text-sm text-gray-500">Loading...</div>}
              {prediction && (
                <div className="mt-2 flex items-baseline gap-3">
                  <div className="text-3xl font-bold">{prediction.yieldTons} t</div>
                  <div className="text-sm text-gray-600">Confidence: {(prediction.confidence*100).toFixed(0)}%</div>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600">Region: Local</div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded">
              <h4 className="font-semibold mb-2">{t('weather')}</h4>
              {weather ? (
                <div>
                  <div>Temp: {weather.tempC}°C</div>
                  <div>Rain next 7d: {weather.rainNext7DaysMm} mm</div>
                  <div>Cond: {weather.condition}</div>
                </div>
              ) : <div className="text-sm text-gray-500">No weather data</div>}
            </div>
            <div className="p-3 border rounded">
              <h4 className="font-semibold mb-2">{t('soil')}</h4>
              {soil ? (
                <div>
                  <div>pH: {soil.ph}</div>
                  <div>Moisture: {soil.moisturePct}%</div>
                  <div>OM: {soil.organicMatterPct}%</div>
                </div>
              ) : <div className="text-sm text-gray-500">No soil data</div>}
            </div>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">Yield trend</h4>
            {/* Simple inline SVG chart mock (replace with recharts/plotly in production) */}
            <div className="w-full h-32 bg-gradient-to-r from-green-100 to-white rounded mt-2 flex items-center justify-center text-gray-500">Chart placeholder</div>
            <div className="text-xs text-gray-500 mt-2">Tap any chart element for a tooltip with farmer-friendly tips.</div>
          </div>

        </section>

        {/* Full-width bottom: Recommendations */}
        <section className="md:col-span-3 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">{t('recs')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendations.map((r,i)=> (
              <div key={i} className="p-3 border rounded">
                <div className="text-sm font-medium">{r.type.toUpperCase()}</div>
                <div className="mt-1 text-sm">{r.msg}</div>
                <div className="mt-2 text-xs text-gray-500">Why: simple rule-based explanation shown to build trust.</div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  )

  return (
    <div>
      {!user || !user.name ? <Login/> : <Dashboard/>}
    </div>
  )
}

/* Implementation notes (frontend):
  - Internationalization: Replace simple dict with i18next. Add text-to-speech for low-literacy users.
  - Charts: Use recharts or nivo for production. Keep tooltips simple and local-language.
  - Accessibility: use aria labels, large touch targets, high color contrast.
  - Offline-first: wrap as PWA, cache last predictions so farmers can view while offline.
  - Backend endpoints to implement: /api/weather, /api/soil, /api/predict, /api/recommendations
*/
