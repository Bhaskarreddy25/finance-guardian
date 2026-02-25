import type { ContractRateCard } from "@/types/invoice";

export const contractRateCards: Record<string, ContractRateCard> = {
  "BlueDart Logistics": {
    approvedRates: {
      "Freight Charges": 1200,
      "Handling Fee": 200,
      "Packaging": 150,
      "Warehousing": 500,
    },
    approvedGstRate: 18,
    approvedFuelSurchargePercent: 5,
    allowedSurchargeTypes: ["Fuel Surcharge"],
  },
  "DHL Express India": {
    approvedRates: {
      "Air Freight": 3500,
      "Ground Shipping": 800,
      "Customs Clearance": 1500,
      "Insurance": 300,
    },
    approvedGstRate: 18,
    approvedFuelSurchargePercent: 4,
    allowedSurchargeTypes: ["Fuel Surcharge", "Peak Season Surcharge"],
  },
  "Gati Shipping": {
    approvedRates: {
      "Surface Transport": 950,
      "Express Delivery": 1800,
      "Loading/Unloading": 250,
      "COD Handling": 100,
    },
    approvedGstRate: 18,
    approvedFuelSurchargePercent: 5,
    allowedSurchargeTypes: ["Fuel Surcharge"],
  },
  "Rivigo Freight": {
    approvedRates: {
      "Full Truck Load": 22000,
      "Part Load": 8500,
      "Relay Docking": 1200,
      "Detention Charges": 500,
    },
    approvedGstRate: 12,
    approvedFuelSurchargePercent: 6,
    allowedSurchargeTypes: ["Fuel Surcharge", "Toll Charges"],
  },
  "Safexpress Logistics": {
    approvedRates: {
      "Freight": 1100,
      "Handling": 180,
      "Value Added Services": 350,
      "Reverse Pickup": 400,
    },
    approvedGstRate: 18,
    approvedFuelSurchargePercent: 5,
    allowedSurchargeTypes: ["Fuel Surcharge"],
  },
};
