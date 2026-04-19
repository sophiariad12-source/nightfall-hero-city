-- Profiles table (persistent player progress)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE CHECK (length(username) >= 2 AND length(username) <= 20),
  gender TEXT NOT NULL DEFAULT 'male' CHECK (gender IN ('male','female')),
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  money INTEGER NOT NULL DEFAULT 100,
  gun_level INTEGER NOT NULL DEFAULT 1,
  sword_level INTEGER NOT NULL DEFAULT 1,
  outfit TEXT NOT NULL DEFAULT 'default',
  zombies_killed INTEGER NOT NULL DEFAULT 0,
  players_killed INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uname TEXT;
BEGIN
  uname := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username',''),
    'Player' || substr(NEW.id::text, 1, 6)
  );
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = uname) LOOP
    uname := uname || floor(random()*100)::int::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, gender)
  VALUES (NEW.id, uname, COALESCE(NEW.raw_user_meta_data->>'gender','male'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (length(code) = 6),
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 40),
  is_public BOOLEAN NOT NULL DEFAULT true,
  max_players INTEGER NOT NULL DEFAULT 8 CHECK (max_players BETWEEN 2 AND 16),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select_all_auth" ON public.rooms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms_insert_own" ON public.rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "rooms_update_host" ON public.rooms
  FOR UPDATE TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "rooms_delete_host" ON public.rooms
  FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE TABLE public.room_members (
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_members_select_auth" ON public.room_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "room_members_insert_self" ON public.room_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "room_members_delete_self" ON public.room_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random()*length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_player_stats(
  _money INTEGER,
  _xp INTEGER,
  _level INTEGER,
  _gun_level INTEGER,
  _sword_level INTEGER,
  _outfit TEXT,
  _zombies_killed INTEGER,
  _players_killed INTEGER,
  _deaths INTEGER
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.profiles SET
    money = GREATEST(0, _money),
    xp = GREATEST(0, _xp),
    level = GREATEST(1, _level),
    gun_level = GREATEST(1, LEAST(_gun_level, 50)),
    sword_level = GREATEST(1, LEAST(_sword_level, 50)),
    outfit = _outfit,
    zombies_killed = GREATEST(zombies_killed, _zombies_killed),
    players_killed = GREATEST(players_killed, _players_killed),
    deaths = GREATEST(deaths, _deaths),
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;