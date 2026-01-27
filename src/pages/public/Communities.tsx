/**
 * Communities Directory - Public Marketing Page
 * 
 * SEO-optimized page showing carpooling communities across the UK.
 * This is a public page that should be indexed by search engines.
 */

import { Link } from 'react-router-dom';
import { Car, MapPin, Users, ArrowRight, Building2, GraduationCap, Briefcase } from 'lucide-react';
import Seo from '../../components/shared/Seo';

const cities = [
  {
    name: 'Cardiff',
    slug: 'cardiff',
    region: 'Wales',
    members: '450+',
    rides: '120+',
    description: 'Connect with commuters across Cardiff, from the Bay to the city center.',
    highlights: ['Cardiff University', 'Cardiff Bay', 'City Centre'],
  },
  {
    name: 'Sheffield',
    slug: 'sheffield',
    region: 'Yorkshire',
    members: '320+',
    rides: '85+',
    description: 'Join Sheffield\'s growing community of eco-conscious commuters.',
    highlights: ['Sheffield University', 'Meadowhall', 'City Centre'],
  },
  {
    name: 'Bristol',
    slug: 'bristol',
    region: 'South West',
    members: '',
    rides: '',
    description: 'Bristol\'s vibrant carpooling scene for professionals and students.',
    highlights: ['Temple Meads', 'Harbourside', 'Clifton'],
    comingSoon: true,
  },
  {
    name: 'Manchester',
    slug: 'manchester',
    region: 'North West',
    members: '',
    rides: '',
    description: 'Greater Manchester\'s growing carpooling network.',
    highlights: ['MediaCity', 'Airport', 'City Centre'],
    comingSoon: true,
  },
];

const communityTypes = [
  {
    icon: Building2,
    title: 'Workplace Communities',
    description: 'Connect with colleagues and share commutes. Many UK employers have dedicated CarpoolNetwork groups.',
    examples: ['BBC Wales', 'NHS Trusts', 'University Staff'],
  },
  {
    icon: GraduationCap,
    title: 'University Communities',
    description: 'Students and staff sharing rides between campus, accommodation, and home.',
    examples: ['Cardiff University', 'Sheffield Hallam', 'Bristol UWE'],
  },
  {
    icon: Briefcase,
    title: 'Business Park Communities',
    description: 'Share rides with professionals working in the same business districts.',
    examples: ['Cardiff Gate', 'Sheffield Business Park', 'Temple Quay'],
  },
];

export default function CommunitiesPage() {
  return (
    <>
      <Seo
        title="Carpooling Communities"
        description="Join local carpooling communities in Cardiff, Sheffield, and across the UK. Connect with commuters, share rides, and reduce your travel costs."
        canonical="/communities"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'CarpoolNetwork Communities',
          description: 'UK Carpooling Communities Directory',
          itemListElement: cities.map((city, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Place',
              name: `${city.name} Carpooling Community`,
              address: {
                '@type': 'PostalAddress',
                addressRegion: city.region,
                addressCountry: 'UK',
              },
            },
          })),
        }}
      />
      
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <header className="bg-gradient-to-br from-purple-600 to-purple-800 text-white">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <Car className="w-8 h-8" />
              CarpoolNetwork
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/how-it-works" className="hover:underline hidden sm:inline">How It Works</Link>
              <Link to="/safety-info" className="hover:underline hidden sm:inline">Safety</Link>
              <Link to="/signin" className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50">
                Sign In
              </Link>
            </div>
          </nav>
          
          <div className="max-w-7xl mx-auto px-4 py-16 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Carpooling Communities
            </h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              Find your local community and start sharing rides with trusted neighbors and colleagues.
            </p>
          </div>
        </header>

        {/* City Communities */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Browse by City
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Choose your city to find rides and connect with local carpoolers.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {cities.map((city) => (
                <div key={city.slug} className="bg-gray-50 rounded-2xl p-6 relative overflow-hidden">
                  {city.comingSoon && (
                    <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-medium">
                      Coming Soon
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{city.name}</h3>
                      <p className="text-gray-500 text-sm mb-2">{city.region}</p>
                      <p className="text-gray-600 mb-4">{city.description}</p>
                      
                      {!city.comingSoon && city.members && (
                        <div className="flex gap-4 mb-4">
                          <div>
                            <div className="text-lg font-semibold text-purple-600">{city.members}</div>
                            <div className="text-xs text-gray-500">Members</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-purple-600">{city.rides}</div>
                            <div className="text-xs text-gray-500">Monthly Rides</div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {city.highlights.map((highlight) => (
                          <span key={highlight} className="bg-white px-3 py-1 rounded-full text-sm text-gray-600">
                            {highlight}
                          </span>
                        ))}
                      </div>
                      
                      {!city.comingSoon ? (
                        <Link
                          to={`/cities/${city.slug}`}
                          className="inline-flex items-center gap-2 text-purple-600 font-medium hover:text-purple-700"
                        >
                          Explore {city.name}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <span className="text-gray-400">Available soon</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Community Types */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Types of Communities
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Join communities based on your workplace, university, or neighborhood.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              {communityTypes.map((type) => (
                <div key={type.title} className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                    <type.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{type.title}</h3>
                  <p className="text-gray-600 mb-4">{type.description}</p>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Examples:</span> {type.examples.join(' • ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-purple-600 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Don't See Your City?
            </h2>
            <p className="text-purple-100 mb-8">
              We're expanding across the UK. Sign up to be notified when we launch in your area.
            </p>
            <Link
              to="/signup"
              className="inline-block px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
            >
              Join the Waitlist
            </Link>
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
