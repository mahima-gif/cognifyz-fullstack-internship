/**
 * data.js
 * Comprehensive geographic data for dependent Country -> State -> City dropdowns.
 * Each country contains multiple states/provinces, and each state contains multiple cities.
 */

export const locationData = {
  "United States": {
    code: "US",
    phoneCode: "+1",
    states: {
      "California": ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento"],
      "New York": ["New York City", "Buffalo", "Rochester", "Albany", "Syracuse"],
      "Texas": ["Houston", "Austin", "Dallas", "San Antonio", "Fort Worth"],
      "Washington": ["Seattle", "Spokane", "Tacoma", "Bellevue", "Olympia"]
    }
  },
  "India": {
    code: "IN",
    phoneCode: "+91",
    states: {
      "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi"],
      "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
      "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
      "Delhi NCR": ["New Delhi", "Noida", "Gurugram", "Faridabad", "Ghaziabad"]
    }
  },
  "United Kingdom": {
    code: "GB",
    phoneCode: "+44",
    states: {
      "England": ["London", "Manchester", "Birmingham", "Bristol", "Leeds"],
      "Scotland": ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Inverness"],
      "Wales": ["Cardiff", "Swansea", "Newport", "Bangor", "St Davids"]
    }
  },
  "Canada": {
    code: "CA",
    phoneCode: "+1",
    states: {
      "Ontario": ["Toronto", "Ottawa", "Mississauga", "Hamilton", "London"],
      "British Columbia": ["Vancouver", "Victoria", "Surrey", "Burnaby", "Kelowna"],
      "Quebec": ["Montreal", "Quebec City", "Laval", "Gatineau", "Sherbrooke"]
    }
  },
  "Germany": {
    code: "DE",
    phoneCode: "+49",
    states: {
      "Bavaria": ["Munich", "Nuremberg", "Augsburg", "Regensburg", "Würzburg"],
      "Berlin": ["Berlin Mitte", "Charlottenburg", "Kreuzberg", "Pankow", "Spandau"],
      "North Rhine-Westphalia": ["Cologne", "Düsseldorf", "Dortmund", "Essen", "Bonn"]
    }
  },
  "Australia": {
    code: "AU",
    phoneCode: "+61",
    states: {
      "New South Wales": ["Sydney", "Newcastle", "Wollongong", "Central Coast"],
      "Victoria": ["Melbourne", "Geelong", "Ballarat", "Bendigo"],
      "Queensland": ["Brisbane", "Gold Coast", "Cairns", "Townsville", "Sunshine Coast"]
    }
  }
};

/**
 * Returns a list of country names.
 */
export function getCountries() {
  return Object.keys(locationData);
}

/**
 * Returns states for a given country.
 */
export function getStates(country) {
  if (!country || !locationData[country]) return [];
  return Object.keys(locationData[country].states);
}

/**
 * Returns cities for a given country and state.
 */
export function getCities(country, state) {
  if (!country || !state || !locationData[country] || !locationData[country].states[state]) {
    return [];
  }
  return locationData[country].states[state];
}

