import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DVLAResponse {
  registrationNumber: string;
  taxStatus?: string;
  taxDueDate?: string;
  artEndDate?: string;
  motStatus?: string;
  motExpiryDate?: string;
  make?: string;
  yearOfManufacture?: number;
  engineCapacity?: number;
  co2Emissions?: number;
  fuelType?: string;
  markedForExport?: boolean;
  colour?: string;
  typeApproval?: string;
  wheelplan?: string;
  revenueWeight?: number;
  euroStatus?: string;
  realDrivingEmissions?: string;
  dateOfLastV5CIssued?: string;
  monthOfFirstRegistration?: string;
}

interface UKVehicleDataResponse {
  Description?: string;
  Make?: string;
  Model?: string;
  Colour?: string;
  FuelType?: string;
  EngineCapacity?: string;
  YearOfManufacture?: string;
  RegistrationYear?: string;
}

interface VehicleData {
  make: string;
  model: string;
  year: number;
  color: string;
  capacity: number;
  fuel_type: string;
  vehicle_type: string;
  registration_year: number;
  engine_capacity?: number;
  image_url: string | null;
  mot_status?: string;
  mot_expiry_date?: string;
  tax_status?: string;
  tax_due_date?: string;
}

function mapFuelType(dvlaFuelType?: string): string {
  if (!dvlaFuelType) return 'petrol';
  
  const fuelType = dvlaFuelType.toLowerCase();
  
  if (fuelType.includes('diesel')) return 'diesel';
  if (fuelType.includes('electric') || fuelType.includes('electricity')) return 'electric';
  if (fuelType.includes('hybrid')) return 'hybrid';
  if (fuelType.includes('petrol')) return 'petrol';
  if (fuelType.includes('gas') || fuelType.includes('cng') || fuelType.includes('lpg')) return 'cng';
  
  return 'petrol';
}

function estimateSeats(engineCapacity?: number, wheelplan?: string): number {
  if (wheelplan && wheelplan.includes('LARGE')) return 7;
  if (engineCapacity && engineCapacity > 2500) return 5;
  return 5;
}

function estimateVehicleType(make?: string, engineCapacity?: number): string {
  if (!make) return 'sedan';
  
  const makeLower = make.toLowerCase();
  
  if (makeLower.includes('range rover') || makeLower.includes('land rover')) return 'suv';
  if (makeLower.includes('mini') || makeLower.includes('fiat 500')) return 'hatchback';
  
  if (engineCapacity) {
    if (engineCapacity < 1200) return 'hatchback';
    if (engineCapacity > 2500) return 'suv';
  }
  
  return 'sedan';
}

async function getVehicleImage(make: string, model: string, year: number): Promise<string | null> {
  return null;
}

async function getVehicleModel(registrationNumber: string): Promise<{ make: string; model: string } | null> {
  try {
    const apiKey = '3c9a4790-3ff3-11ef-a21e-c5148fb7d99e';

    const response = await fetch(
      `https://uk1.ukvehicledata.co.uk/api/datapackage/VehicleData?v=2&api_nullitems=1&auth_apikey=${apiKey}&key_VRM=${registrationNumber}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data: { Response?: { DataItems?: UKVehicleDataResponse } } = await response.json();

      if (data.Response?.DataItems) {
        const vehicleData = data.Response.DataItems;
        const make = vehicleData.Make || 'Unknown';
        const model = vehicleData.Model || vehicleData.Description || make;

        return { make, model };
      }
    }
  } catch (error) {
    console.error('Error fetching vehicle model:', error);
  }

  return null;
}

async function lookupVehicleDVLA(registrationNumber: string): Promise<VehicleData | null> {
  const DVLA_API_KEY = 'MQ0ae3fM8Y3PqXZf89ZsC7c9ewwi2Z3i27ShinPa';

  try {
    const cleanRegNumber = registrationNumber.replace(/\s/g, '').toUpperCase();

    const response = await fetch(
      'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
      {
        method: 'POST',
        headers: {
          'x-api-key': DVLA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationNumber: cleanRegNumber,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`DVLA API error: ${response.status}`, errorBody);

      if (response.status === 404) {
        return null;
      }
      if (response.status === 400) {
        return null;
      }
      throw new Error(`DVLA API error: ${response.status}`);
    }

    const dvlaData: DVLAResponse = await response.json();

    let make = dvlaData.make || 'Unknown';
    let model = make;
    const year = dvlaData.yearOfManufacture || new Date().getFullYear();

    const vehicleModelData = await getVehicleModel(cleanRegNumber);
    if (vehicleModelData) {
      make = vehicleModelData.make;
      model = vehicleModelData.model;
    }

    const imageUrl = await getVehicleImage(make, model, year);

    return {
      make: make,
      model: model,
      year: year,
      color: dvlaData.colour || 'Not specified',
      capacity: estimateSeats(dvlaData.engineCapacity, dvlaData.wheelplan),
      fuel_type: mapFuelType(dvlaData.fuelType),
      vehicle_type: estimateVehicleType(dvlaData.make, dvlaData.engineCapacity),
      registration_year: year,
      engine_capacity: dvlaData.engineCapacity,
      image_url: imageUrl,
      mot_status: dvlaData.motStatus,
      mot_expiry_date: dvlaData.motExpiryDate,
      tax_status: dvlaData.taxStatus,
      tax_due_date: dvlaData.taxDueDate,
    };
  } catch (error) {
    console.error('DVLA lookup error:', error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { registrationNumber } = await req.json();

    if (!registrationNumber || typeof registrationNumber !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Registration number is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const vehicleData = await lookupVehicleDVLA(registrationNumber);

    if (!vehicleData) {
      return new Response(
        JSON.stringify({ error: 'Vehicle not found. Please check the registration number and try again.' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: vehicleData }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});