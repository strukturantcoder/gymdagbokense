-- Create table for storing GPS routes from cardio sessions
CREATE TABLE public.cardio_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cardio_log_id UUID NOT NULL REFERENCES public.cardio_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  route_data JSONB NOT NULL,
  total_distance_km NUMERIC NOT NULL DEFAULT 0,
  average_speed_kmh NUMERIC NOT NULL DEFAULT 0,
  max_speed_kmh NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cardio_routes ENABLE ROW LEVEL SECURITY;

-- Users can view own routes
CREATE POLICY "Users can view own cardio routes" 
ON public.cardio_routes 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert own routes
CREATE POLICY "Users can insert own cardio routes" 
ON public.cardio_routes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete own routes
CREATE POLICY "Users can delete own cardio routes" 
ON public.cardio_routes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_cardio_routes_cardio_log_id ON public.cardio_routes(cardio_log_id);
CREATE INDEX idx_cardio_routes_user_id ON public.cardio_routes(user_id);