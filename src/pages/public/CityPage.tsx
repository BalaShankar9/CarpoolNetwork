/**
 * City Page Component - Public Marketing Page
 * 
 * SEO-optimized page for city-specific carpooling information.
 * This is a public page that should be indexed by search engines.
 */

import { useParams, Link, Navigate } from 'react-router-dom';
import { Car, MapPin, Users, ArrowRight, Building2, Train, TreePine, Clock, Leaf } from 'lucide-react';
import Seo from '../../components/shared/Seo';

interface CityData {
  name: string;
  region: string;
  description: string;
  longDescription: string;
  population: string;
  members: string;
  monthlyRides: string;
  avgSavings: string;
  co2Saved: string;
  popularRoutes: { from: string; to: string; rides: string }[];
  landmarks: string[];
  universities: string[];
  employers: string[];
}

const cityData: Record<string, CityData> = {
  cardiff: {
    name: 'Cardiff',
    region: 'Wales',
    description: 'Join Cardiff\'s thriving carpooling community and share rides across Wales\' capital city.',
    longDescription: 'Cardiff is a vibrant city with a growing community of eco-conscious commuters. From university students traveling between campuses to professionals commuting to Cardiff Bay, CarpoolNetwork connects thousands of people looking to share their journeys.',
    population: '362,000',
    members: '2,400+',
    monthlyRides: '850+',
    avgSavings: '£140',
    co2Saved: '12 tonnes',
    popularRoutes: [
      { from: 'Cardiff Bay', to: 'City Centre', rides: '120+ weekly' },
      { from: 'Canton', to: 'Cardiff University', rides: '85+ weekly' },
      { from: 'Penarth', to: 'Cardiff Central', rides: '60+ weekly' },
      { from: 'Newport', to: 'Cardiff', rides: '150+ weekly' },
    ],
    landmarks: ['Millennium Stadium', 'Cardiff Bay', 'Cardiff Castle', 'Bute Park'],
    universities: ['Cardiff University', 'Cardiff Metropolitan', 'University of South Wales'],
    employers: ['BBC Wales', 'Welsh Government', 'Admiral', 'NHS Wales'],
  },
  sheffield: {
    name: 'Sheffield',
    region: 'South Yorkshire',
    description: 'Connect with Sheffield\'s community of smart commuters and share your journey.',
    longDescription: 'Sheffield, known as the Steel City, has embraced sustainable transport. With two major universities and a thriving business community, there\'s always someone heading your way. Join our growing network of Sheffield carpoolers.',
    population: '584,000',
    members: '1,800+',
    monthlyRides: '620+',
    avgSavings: '£130',
    co2Saved: '9 tonnes',
    popularRoutes: [
      { from: 'Meadowhall', to: 'City Centre', rides: '90+ weekly' },
      { from: 'Sheffield University', to: 'Hallam', rides: '70+ weekly' },
      { from: 'Doncaster', to: 'Sheffield', rides: '110+ weekly' },
      { from: 'Rotherham', to: 'Sheffield', rides: '95+ weekly' },
    ],
    landmarks: ['Sheffield Winter Garden', 'Meadowhall', 'Peak District', 'Kelham Island'],
    universities: ['University of Sheffield', 'Sheffield Hallam University'],
    employers: ['NHS Sheffield', 'Sheffield City Council', 'HSBC', 'Boeing'],
  },
};

export default function CityPage() {
  const { city } = useParams<{ city: string }>();
  
  const data = city ? cityData[city] : null;
  
  if (!data) {
    return <Navigate to="/communities" replace />;
  }

  return (
    <>
      <Seo
        title={`Carpooling in ${data.name}`}
        description={`${data.description} Save money on your commute and reduce your carbon footprint with ${data.members} local carpoolers.`}
        canonical={`/cities/${city}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Place',
          name: `${data.name} Carpooling Community`,
          description: data.description,
          address: {
            '@type': 'PostalAddress',
            addressLocality: data.name,
            addressRegion: data.region,
            addressCountry: 'UK',
          },
          geo: {
            '@type': 'GeoCoordinates',
            // Note: Add actual coordinates for each city
          },
        }}
      />
      
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <header className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <Car className="w-8 h-8" />
              CarpoolNetwork
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/communities" className="hover:underline hidden sm:inline">Communities</Link>
              <Link to="/how-it-works" className="hover:underline hidden sm:inline">How It Works</Link>
              <Link to="/signin" className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50">
                Sign In
              </Link>
            </div>
          </nav>
          
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="flex items-center gap-2 text-blue-200 mb-4">
              <Link to="/communities" className="hover:text-white">Communities</Link>
              <span>/</span>
              <span>{data.name}</span>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <MapPin className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold">
                  Carpooling in {data.name}
                </h1>
                <p className="text-blue-200">{data.region}, UK</p>
              </div>
            </div>
            <p className="text-xl text-blue-100 max-w-2xl">
              {data.description}
            </p>
          </div>
        </header>

        {/* Stats Bar */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{data.members}</div>
                <div className="text-gray-500 text-sm">Members</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{data.monthlyRides}</div>
                <div className="text-gray-500 text-sm">Monthly Rides</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{data.avgSavings}</div>
                <div className="text-gray-500 text-sm">Avg Monthly Savings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{data.co2Saved}</div>
                <div className="text-gray-500 text-sm">CO₂ Saved Monthly</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-600">{data.population}</div>
                <div className="text-gray-500 text-sm">Population</div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">
                  Why Carpool in {data.name}?
                </h2>
                <p className="text-gray-600 mb-6">
                  {data.longDescription}
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Leaf className="w-5 h-5 text-green-600" />
                    </div>
                    <span>Reduce your carbon footprint</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <span>Save time with HOV lane access</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <span>Meet interesting people on your commute</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-100 rounded-2xl p-8">
                <h3 className="font-semibold text-lg mb-4">Popular Landmarks</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {data.landmarks.map((landmark) => (
                    <span key={landmark} className="bg-white px-3 py-1 rounded-full text-sm">
                      {landmark}
                    </span>
                  ))}
                </div>
                <h3 className="font-semibold text-lg mb-4">Universities</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {data.universities.map((uni) => (
                    <span key={uni} className="bg-white px-3 py-1 rounded-full text-sm">
                      {uni}
                    </span>
                  ))}
                </div>
                <h3 className="font-semibold text-lg mb-4">Major Employers</h3>
                <div className="flex flex-wrap gap-2">
                  {data.employers.map((employer) => (
                    <span key={employer} className="bg-white px-3 py-1 rounded-full text-sm">
                      {employer}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Routes */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Popular Routes in {data.name}
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              These are the most frequently shared routes in your area.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.popularRoutes.map((route) => (
                <div key={`${route.from}-${route.to}`} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-500 mb-1">From</div>
                  <div className="font-semibold mb-2">{route.from}</div>
                  <div className="text-sm text-gray-500 mb-1">To</div>
                  <div className="font-semibold mb-4">{route.to}</div>
                  <div className="text-sm text-blue-600 font-medium">{route.rides}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-blue-600 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Start Carpooling in {data.name} Today
            </h2>
            <p className="text-blue-100 mb-8">
              Join {data.members} local members and start saving money on your commute.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                to="/how-it-works"
                className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Learn How It Works
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 py-12 px-4">
          <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-lg mb-4">
                <Car className="w-6 h-6" />
                CarpoolNetwork
              </div>
              <p className="text-sm">
                The UK's trusted platform for sharing rides and reducing travel costs.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Learn More</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/how-it-works" className="hover:text-white">How It Works</Link></li>
                <li><Link to="/safety-info" className="hover:text-white">Safety</Link></li>
                <li><Link to="/communities" className="hover:text-white">Communities</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Cities</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/cities/cardiff" className="hover:text-white">Cardiff</Link></li>
                <li><Link to="/cities/sheffield" className="hover:text-white">Sheffield</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            © {new Date().getFullYear()} CarpoolNetwork. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
}
