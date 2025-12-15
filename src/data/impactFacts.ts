export interface ImpactFact {
  text: string;
  sourceLabel?: string;
  sourceUrl?: string;
  publishedDate?: string;
}

export const impactFactsByRoute: Record<string, ImpactFact[]> = {
  '/signin': [
    { text: 'Sharing rides can reduce the number of cars on the road during peak hours.' },
    { text: 'Carpooling helps lower fuel use per person compared to driving alone.' },
    { text: 'Fewer cars can mean smoother commutes and less time spent in traffic.' },
    { text: 'Sharing a ride can reduce parking demand around busy areas.' },
    { text: 'Splitting a trip can make commuting more affordable.' },
    { text: 'Fewer vehicles can help reduce local air pollution in city centres.' },
    { text: 'Carpooling uses existing seats more efficiently.' },
    { text: 'A shared commute can feel less stressful when planned well.' },
    { text: 'Regular carpooling can help build community connections.' },
    { text: 'Ride-sharing can complement public transport for the last mile.' },
  ],
  '/signup': [
    { text: 'Joining a carpool network connects you with local commuters.' },
    { text: 'New members help create more ride-sharing opportunities.' },
    { text: 'Carpooling can save you money on fuel and parking costs.' },
    { text: 'Shared rides mean fewer cars clogging up the roads.' },
    { text: 'By carpooling, you contribute to cleaner air in your community.' },
    { text: 'Ride-sharing helps reduce the environmental impact of daily commutes.' },
    { text: 'Carpooling can turn your commute into productive or social time.' },
    { text: 'Fewer solo drivers means less traffic congestion for everyone.' },
    { text: 'Sharing rides can make commuting more enjoyable and less isolating.' },
    { text: 'Carpooling networks thrive when more people participate.' },
  ],
  '/forgot-password': [
    { text: 'Carpooling helps reduce carbon emissions per traveler.' },
    { text: 'Shared rides can make your daily commute more affordable.' },
    { text: 'Fewer cars on the road means less wear on infrastructure.' },
    { text: 'Carpooling can reduce the need for additional parking spaces.' },
    { text: 'Ride-sharing helps connect areas with limited public transport.' },
    { text: 'Choosing to share a ride is a simple habit that can reduce overall emissions.' },
    { text: 'Carpooling can help you meet neighbors and build community.' },
    { text: 'Shared commutes can reduce stress compared to driving alone in traffic.' },
    { text: 'Fewer vehicles means quieter, more pleasant neighborhoods.' },
    { text: 'Carpooling makes better use of vehicles that would otherwise travel empty.' },
  ],
  '/reset-password': [
    { text: 'Carpooling can significantly lower your transportation costs.' },
    { text: 'Shared rides help reduce traffic congestion in urban areas.' },
    { text: 'Fewer cars means better air quality for everyone.' },
    { text: 'Ride-sharing can make commuting more social and enjoyable.' },
    { text: 'Carpooling helps maximize the efficiency of existing vehicles.' },
    { text: 'Sharing rides can reduce the environmental footprint of travel.' },
    { text: 'Fewer solo drivers means less demand for parking infrastructure.' },
    { text: 'Carpooling can turn wasted commute time into productive time.' },
    { text: 'Shared rides help support sustainable urban mobility.' },
    { text: 'Choosing to carpool is a practical way to reduce emissions.' },
  ],
  '/verify-otp': [
    { text: 'Every shared ride helps reduce traffic congestion.' },
    { text: 'Carpooling makes your commute more cost-effective.' },
    { text: 'Fewer cars on the road means cleaner air for your community.' },
    { text: 'Shared rides can make your daily commute less stressful.' },
    { text: 'Carpooling helps reduce the carbon footprint of travel.' },
    { text: 'Ride-sharing connects people and builds community ties.' },
    { text: 'Fewer vehicles means less noise pollution in neighborhoods.' },
    { text: 'Carpooling helps make better use of existing road capacity.' },
    { text: 'Shared commutes can reduce the need for expensive parking.' },
    { text: 'Choosing to carpool contributes to a more sustainable future.' },
  ],
};

export function getFactsForRoute(route: string): ImpactFact[] {
  return impactFactsByRoute[route] || impactFactsByRoute['/signin'];
}

export function getRandomFact(route: string): ImpactFact {
  const facts = getFactsForRoute(route);
  return facts[Math.floor(Math.random() * facts.length)];
}
