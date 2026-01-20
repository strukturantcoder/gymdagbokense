import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Garmin exercise category ID to name mapping (most common strength exercises)
const EXERCISE_CATEGORY_MAP: Record<number, string> = {
  0: "Bench Press",
  1: "Calf Raise",
  2: "Cardio",
  3: "Carry",
  4: "Chop",
  5: "Core",
  6: "Crunch",
  7: "Curl",
  8: "Deadlift",
  9: "Flye",
  10: "Hip Raise",
  11: "Hip Stability",
  12: "Hip Swing",
  13: "Hyperextension",
  14: "Lateral Raise",
  15: "Leg Curl",
  16: "Leg Raise",
  17: "Lunge",
  18: "Olympic Lift",
  19: "Plank",
  20: "Plyo",
  21: "Pull Up",
  22: "Push Up",
  23: "Row",
  24: "Shoulder Press",
  25: "Shoulder Stability",
  26: "Shrug",
  27: "Sit Up",
  28: "Squat",
  29: "Total Body",
  30: "Triceps Extension",
  31: "Warm Up",
  32: "Run",
  65534: "Unknown",
  65535: "Unknown",
};

// More specific exercise name mapping within categories
const EXERCISE_NAME_MAP: Record<number, Record<number, string>> = {
  0: { // Bench Press category
    0: "Barbell Bench Press",
    1: "Barbell Board Bench Press",
    2: "Barbell Floor Press",
    3: "Close-Grip Barbell Bench Press",
    4: "Decline Barbell Bench Press",
    5: "Dumbbell Bench Press",
    6: "Dumbbell Floor Press",
    7: "Incline Barbell Bench Press",
    8: "Incline Dumbbell Bench Press",
    9: "Neutral-Grip Dumbbell Bench Press",
    65534: "Bench Press",
  },
  7: { // Curl category
    0: "Alternating Dumbbell Biceps Curl",
    1: "Alternating Dumbbell Biceps Curl on Swiss Ball",
    2: "Alternating Incline Dumbbell Biceps Curl",
    3: "Barbell Biceps Curl",
    4: "Barbell Reverse Wrist Curl",
    5: "Barbell Wrist Curl",
    6: "Behind the Back Barbell Reverse Curl",
    7: "Behind the Back One-Arm Cable Curl",
    8: "Cable Biceps Curl",
    9: "Cable Hammer Curl",
    10: "Cheating Barbell Biceps Curl",
    11: "Close-Grip EZ Bar Biceps Curl",
    12: "Cross Body Dumbbell Hammer Curl",
    13: "Dead Hang Biceps Curl",
    14: "Decline Hammer Curl",
    15: "Dumbbell Biceps Curl",
    16: "Dumbbell Biceps Curl with Static Hold",
    17: "Dumbbell Hammer Curl",
    18: "Dumbbell Reverse Curl",
    19: "EZ-Bar Preacher Curl",
    65534: "Biceps Curl",
  },
  8: { // Deadlift category
    0: "Barbell Deadlift",
    1: "Barbell Straight-Leg Deadlift",
    2: "Dumbbell Deadlift",
    3: "Dumbbell Single-Leg Deadlift",
    4: "Dumbbell Straight-Leg Deadlift",
    5: "Kettlebell Deadlift",
    6: "Sumo Deadlift",
    7: "Sumo Deadlift High Pull",
    8: "Trap Bar Deadlift",
    65534: "Deadlift",
  },
  17: { // Lunge category
    0: "Overhead Lunge",
    1: "Lunge Matrix",
    2: "Weighted Lunge",
    3: "Walking Lunge",
    4: "Dumbbell Lunge",
    5: "Barbell Lunge",
    65534: "Lunge",
  },
  21: { // Pull Up category
    0: "Banded Pull-Ups",
    1: "Burpee Pull-Up",
    2: "Close-Grip Chin-Up",
    3: "Close-Grip Lat Pulldown",
    4: "Crossover Chin-Up",
    5: "EZ-Bar Pullover",
    6: "Hanging Knee Raise",
    7: "Kneeling Lat Pulldown",
    8: "Kneeling Underhand Grip Lat Pulldown",
    9: "Lat Pulldown",
    10: "Machine Lat Pulldown",
    11: "Mixed-Grip Chin-Up",
    12: "Mixed-Grip Pull-Up",
    13: "Reverse-Grip Pulldown",
    14: "Standing Cable Pullover",
    15: "Straight-Arm Pulldown",
    16: "Swiss Ball EZ-Bar Pullover",
    17: "Towel Pull-Up",
    18: "Weighted Pull-Up",
    65534: "Pull-Up",
  },
  22: { // Push Up category
    0: "Chest Press",
    1: "Clapping Push-Up",
    2: "Close-Grip Medicine Ball Push-Up",
    3: "Close-Hands Push-Up",
    4: "Decline Push-Up",
    5: "Diamond Push-Up",
    6: "Explosive Crossover Push-Up",
    7: "Explosive Push-Up",
    8: "Feet Elevated Side to Side Push-Up",
    9: "Hand Release Push-Up",
    10: "Incline Push-Up",
    11: "Isometric Explosive Push-Up",
    12: "Judo Push-Up",
    13: "Kneeling Push-Up",
    14: "Medicine Ball Chest Pass",
    15: "Medicine Ball Push-Up",
    16: "Modified Push-Up",
    17: "One-Arm Push-Up",
    18: "Parallette Handstand Push-Up",
    19: "Push-Up",
    20: "Push-Up and Row",
    21: "Push-Up Plus",
    22: "Push-Up with Feet on Swiss Ball",
    23: "Push-Up with One Hand on Medicine Ball",
    24: "Ring Push-Up",
    65534: "Push-Up",
  },
  23: { // Row category
    0: "Alternating Dumbbell Row",
    1: "Barbell Bent-Over Row",
    2: "Barbell Shrug",
    3: "Body Weight Mid-Row",
    4: "Cable Row",
    5: "Cable Row with External Rotation",
    6: "Dumbbell Row",
    7: "Elevated Feet Inverted Row",
    8: "Face Pull",
    9: "Face Pull with External Rotation",
    10: "Inverted Row",
    11: "Kettlebell Row",
    12: "Modified Inverted Row",
    13: "Neutral-Grip Alternating Dumbbell Row",
    14: "One-Arm Bent-Over Row",
    15: "One-Arm Cable Row",
    16: "One-Arm Cable Row and Rotation",
    17: "One-Arm Dumbbell Row",
    18: "Prone Row",
    19: "Reverse Grip Barbell Row",
    20: "Rope Handle Cable Row",
    21: "Seated Cable Row",
    22: "Seated Dumbbell Row",
    65534: "Row",
  },
  24: { // Shoulder Press category
    0: "Alternating Dumbbell Shoulder Press",
    1: "Arnold Press",
    2: "Barbell Front Squat to Push Press",
    3: "Barbell Push Press",
    4: "Barbell Shoulder Press",
    5: "Dead Curl Press",
    6: "Dumbbell Alternating Shoulder Press and Twist",
    7: "Dumbbell Hammer Curl to Lunge to Press",
    8: "Dumbbell Push Press",
    9: "Floor Inverted Shoulder Press",
    10: "Inverted Shoulder Press",
    11: "One-Arm Push Press",
    12: "Overhead Barbell Press",
    13: "Overhead Dumbbell Press",
    14: "Seated Barbell Shoulder Press",
    15: "Seated Dumbbell Shoulder Press",
    16: "Single-Arm Standing Dumbbell Press",
    17: "Single-Arm Landmine Press",
    18: "Standing Barbell Shoulder Press",
    19: "Standing Dumbbell Shoulder Press",
    65534: "Shoulder Press",
  },
  28: { // Squat category
    0: "Leg Press",
    1: "Back Squat",
    2: "Weighted Wall Squat",
    3: "Wall Ball Squat",
    4: "Dumbbell Squat",
    5: "Box Squat",
    6: "Bulgarian Squat",
    7: "Front Squat",
    8: "Goblet Squat",
    9: "Overhead Squat",
    10: "Pistol Squat",
    11: "Plie Squat",
    12: "Split Squat",
    13: "Sumo Squat",
    14: "Zercher Squat",
    15: "Barbell Back Squat",
    16: "Barbell Box Squat",
    17: "Barbell Front Squat",
    65534: "Squat",
  },
  30: { // Triceps Extension category
    0: "Bench Dip",
    1: "Body Weight Dip",
    2: "Cable Kickback",
    3: "Cable Lying Triceps Extension",
    4: "Cable Overhead Triceps Extension",
    5: "Dumbbell Kickback",
    6: "Dumbbell Lying Triceps Extension",
    7: "EZ-Bar Overhead Triceps Extension",
    8: "EZ-Bar Skullcrusher",
    9: "Narrow-Grip Bench Press",
    10: "One-Arm Cable Overhead Triceps Extension",
    11: "One-Arm Dumbbell Overhead Triceps Extension",
    12: "Overhead Dumbbell Triceps Extension",
    13: "Reverse-Grip Cable Pressdown",
    14: "Reverse-Grip Triceps Pressdown",
    15: "Rope Pressdown",
    16: "Seated Barbell Overhead Triceps Extension",
    17: "Seated Dumbbell Overhead Triceps Extension",
    18: "Seated EZ-Bar Overhead Triceps Extension",
    19: "Seated One-Arm Overhead Dumbbell Extension",
    20: "Single-Arm Cable Triceps Extension",
    21: "Swiss Ball Dumbbell Lying Triceps Extension",
    22: "Swiss Ball EZ-Bar Lying Triceps Extension",
    23: "Swiss Ball EZ-Bar Overhead Triceps Extension",
    24: "Tabletop Dip",
    25: "Triceps Extension Machine",
    26: "Triceps Pressdown",
    27: "Weighted Dip",
    65534: "Triceps Extension",
  },
};

// Get exercise name from Garmin IDs
function getExerciseName(categoryId: number, exerciseId: number): string {
  // First try to get specific exercise name
  const categoryExercises = EXERCISE_NAME_MAP[categoryId];
  if (categoryExercises && categoryExercises[exerciseId]) {
    return categoryExercises[exerciseId];
  }
  
  // Fall back to category name
  return EXERCISE_CATEGORY_MAP[categoryId] || `Exercise ${categoryId}`;
}

// Simple FIT file parser for strength training data
// FIT files are binary and we need to extract set messages
async function parseFitFileForStrength(fitBuffer: ArrayBuffer): Promise<{
  exercises: Array<{
    exerciseName: string;
    sets: number;
    reps: number[];
    weight: number[]; // in kg
  }>;
}> {
  const bytes = new Uint8Array(fitBuffer);
  const exercises: Array<{
    exerciseName: string;
    sets: number;
    reps: number[];
    weight: number[];
  }> = [];
  
  // FIT file structure:
  // - 14 byte header
  // - Data records (variable length)
  // - 2 byte CRC
  
  // We need to find "set" messages (message type 225)
  // Each set contains: reps, weight, exercise_category, exercise_name
  
  // For now, we'll use a simplified parser that looks for set data patterns
  // A full implementation would require complete FIT protocol parsing
  
  try {
    // Skip header (12 or 14 bytes depending on version)
    let offset = bytes[0]; // Header size is first byte
    
    // Track current exercise data
    const exerciseMap = new Map<string, { reps: number[]; weight: number[] }>();
    
    // Scan through the file looking for set message patterns
    // Set messages have specific field patterns we can detect
    while (offset < bytes.length - 10) {
      // Look for patterns that indicate set data
      // This is a simplified approach - a full parser would decode all messages
      
      // Check for possible set record header (simplified detection)
      const recordHeader = bytes[offset];
      const isDefinition = (recordHeader & 0x40) !== 0;
      const localMessageType = recordHeader & 0x0F;
      
      if (!isDefinition && localMessageType <= 15) {
        // This might be a data message
        // For strength training, we look for specific value patterns
        
        // Read potential reps (1-100 range typically)
        const possibleReps = bytes[offset + 1];
        // Read potential weight (in 100g units, so 0-1000 = 0-100kg typical range)
        const possibleWeight = (bytes[offset + 3] << 8) | bytes[offset + 2];
        // Read potential exercise category
        const possibleCategory = bytes[offset + 5];
        
        // Validate as potential set data
        if (
          possibleReps > 0 && possibleReps <= 100 &&
          possibleWeight >= 0 && possibleWeight <= 5000 && // Up to 500kg
          possibleCategory <= 32 // Valid exercise category
        ) {
          const exerciseName = EXERCISE_CATEGORY_MAP[possibleCategory] || `Exercise ${possibleCategory}`;
          const weightKg = possibleWeight / 10; // Convert from 100g to kg
          
          if (!exerciseMap.has(exerciseName)) {
            exerciseMap.set(exerciseName, { reps: [], weight: [] });
          }
          
          const exercise = exerciseMap.get(exerciseName)!;
          exercise.reps.push(possibleReps);
          exercise.weight.push(weightKg);
        }
      }
      
      offset++;
    }
    
    // Convert map to array
    for (const [name, data] of exerciseMap) {
      if (data.reps.length > 0) {
        exercises.push({
          exerciseName: name,
          sets: data.reps.length,
          reps: data.reps,
          weight: data.weight,
        });
      }
    }
  } catch (error) {
    console.error("Error parsing FIT file:", error);
  }
  
  return { exercises };
}

// OAuth1 signature generation for Garmin API
function generateOAuth1Signature(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  token: string,
  tokenSecret: string,
  timestamp: string,
  nonce: string
): string {
  // Simplified OAuth1 - in production use a proper library
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    `oauth_consumer_key=${consumerKey}&oauth_nonce=${nonce}&oauth_signature_method=HMAC-SHA1&oauth_timestamp=${timestamp}&oauth_token=${token}&oauth_version=1.0`
  )}`;
  
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  // Create HMAC-SHA1 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingKey);
  const messageData = encoder.encode(baseString);
  
  // Note: In Deno, we'd use crypto.subtle for proper HMAC
  // For now return a placeholder - full OAuth1 needs proper crypto
  return btoa(String.fromCharCode(...new Uint8Array(32)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const consumerKey = Deno.env.get("GARMIN_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("GARMIN_CONSUMER_SECRET");

  if (!consumerKey || !consumerSecret) {
    return new Response(
      JSON.stringify({ error: "Garmin API credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { garminActivityId, workoutLogId } = await req.json();

    if (!garminActivityId) {
      return new Response(
        JSON.stringify({ error: "garminActivityId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's Garmin connection
    const { data: connection, error: connError } = await supabase
      .from("garmin_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Garmin not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the activity to check if we have the callback URL
    const { data: activity } = await supabase
      .from("garmin_activities")
      .select("raw_data")
      .eq("garmin_activity_id", garminActivityId)
      .eq("user_id", user.id)
      .single();

    // deno-lint-ignore no-explicit-any
    const rawData = activity?.raw_data as any;
    const callbackUrl = rawData?.file_callback_url;

    if (!callbackUrl) {
      // Try to fetch from Garmin Activity API directly
      const activityFileUrl = `https://apis.garmin.com/wellness-api/rest/activityFile?activityId=${garminActivityId}`;
      
      console.log("Fetching activity file from:", activityFileUrl);

      const response = await fetch(activityFileUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${connection.oauth_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch activity file:", response.status, errorText);
        
        return new Response(
          JSON.stringify({ 
            error: "Could not fetch activity file from Garmin",
            details: `Status: ${response.status}`,
            message: "Garmin may not have detailed exercise data for this activity. Only activities recorded with specific exercise tracking will have individual exercise information."
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Parse the FIT file
      const fitBuffer = await response.arrayBuffer();
      const { exercises } = await parseFitFileForStrength(fitBuffer);

      if (exercises.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true,
            message: "No exercise data found in activity file. This may be a manually tracked activity without specific exercise information.",
            exercisesCreated: 0 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create exercise_logs if we have a workout_log_id
      let exercisesCreated = 0;
      
      if (workoutLogId) {
        for (const exercise of exercises) {
          // Calculate average/max weight for the exercise
          const maxWeight = Math.max(...exercise.weight);
          const totalReps = exercise.reps.reduce((a, b) => a + b, 0);
          
          const { error: insertError } = await supabase
            .from("exercise_logs")
            .insert({
              workout_log_id: workoutLogId,
              exercise_name: exercise.exerciseName,
              sets_completed: exercise.sets,
              reps_completed: exercise.reps.join(", "),
              weight_kg: maxWeight > 0 ? maxWeight : null,
              set_details: exercise.weight.map((w, i) => ({
                setNumber: i + 1,
                reps: exercise.reps[i],
                weight: w,
              })),
              notes: `Synkad från Garmin`,
            });

          if (!insertError) {
            exercisesCreated++;
          } else {
            console.error("Failed to create exercise_log:", insertError);
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          exercises,
          exercisesCreated,
          message: `Found ${exercises.length} exercises, created ${exercisesCreated} exercise logs`
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If we have a callback URL, use that to fetch the file
    const response = await fetch(callbackUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${connection.oauth_token}`,
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch activity file from callback URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fitBuffer = await response.arrayBuffer();
    const { exercises } = await parseFitFileForStrength(fitBuffer);

    // Create exercise_logs if we have a workout_log_id
    let exercisesCreated = 0;
    
    if (workoutLogId && exercises.length > 0) {
      for (const exercise of exercises) {
        const maxWeight = Math.max(...exercise.weight);
        
        const { error: insertError } = await supabase
          .from("exercise_logs")
          .insert({
            workout_log_id: workoutLogId,
            exercise_name: exercise.exerciseName,
            sets_completed: exercise.sets,
            reps_completed: exercise.reps.join(", "),
            weight_kg: maxWeight > 0 ? maxWeight : null,
            set_details: exercise.weight.map((w, i) => ({
              setNumber: i + 1,
              reps: exercise.reps[i],
              weight: w,
            })),
            notes: `Synkad från Garmin`,
          });

        if (!insertError) {
          exercisesCreated++;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        exercises,
        exercisesCreated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error fetching strength exercises:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
