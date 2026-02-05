
export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  vitamins?: string[];
}

export interface RecipeStep {
  step: number;
  instruction: string;
}

export interface FoodData {
  food_name: string;
  confidence: string;
  nutrition: NutritionData;
  ingredients: string[];
  recipe: RecipeStep[];
  allergens: string[];
  serving_size: string;
  cuisine: string;
  classification: string; // Veg, Non-Veg, Vegan
  tips?: string[];
}

export interface AnalysisHistory {
  id: string;
  timestamp: number;
  imageUrl: string;
  data: FoodData;
}
