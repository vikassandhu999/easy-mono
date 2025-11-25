--
-- PostgreSQL database dump
--

-- Dumped from database version 15.14
-- Dumped by pg_dump version 17.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    handle character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    owner_id uuid NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    phone character varying(255),
    notes text,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    user_id uuid,
    business_id uuid NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: coaches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coaches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bio text,
    specialties character varying(255)[],
    credentials jsonb,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredients (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    image_url character varying(255),
    meta_info jsonb DEFAULT '{}'::jsonb,
    business_id uuid NOT NULL,
    creator_id uuid,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL,
    description text,
    source character varying(255),
    calories_per_100g numeric(10,2),
    protein_per_100g numeric(10,2),
    carbohydrates_per_100g numeric(10,2),
    fats_per_100g numeric(10,2),
    fiber_per_100g numeric(10,2)
);


--
-- Name: meal_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_items (
    id uuid NOT NULL,
    sort_order integer DEFAULT 0,
    recipe_id uuid NOT NULL,
    meal_id uuid NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL,
    servings numeric
);


--
-- Name: meals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meals (
    id uuid NOT NULL,
    daytime character varying(255) NOT NULL,
    day_number integer NOT NULL,
    label character varying(255),
    "time" time(0) without time zone,
    notes text,
    nutrition_plan_id uuid NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL,
    sort_order integer DEFAULT 0
);


--
-- Name: measurement_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.measurement_units (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    abbreviation character varying(255) NOT NULL,
    system character varying(255) NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: nutrition_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_plans (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    thumbnail_url character varying(255),
    is_template boolean DEFAULT true,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    duration_weeks integer,
    start_date date,
    tags character varying(255)[] DEFAULT ARRAY[]::character varying[],
    client_id uuid,
    original_plan_id uuid,
    business_id uuid NOT NULL,
    creator_id uuid,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: one_time_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.one_time_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    expires_at timestamp(0) without time zone NOT NULL,
    user_id uuid,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL,
    token uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    attempts integer DEFAULT 0,
    used_at timestamp(0) without time zone
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    price_cents integer NOT NULL,
    billing_interval character varying(255) NOT NULL,
    features jsonb,
    limits jsonb,
    is_default boolean DEFAULT false NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: recipe_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_ingredients (
    id uuid NOT NULL,
    "order" integer NOT NULL,
    quantity numeric,
    quantity_as_text character varying(255),
    recipe_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    unit_id uuid,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    instructions character varying(255)[] DEFAULT ARRAY[]::character varying[],
    instructions_as_text text,
    prep_time_minutes integer,
    cook_time_minutes integer,
    servings integer DEFAULT 1,
    total_calories numeric,
    total_protein numeric,
    total_carbohydrates numeric,
    total_fats numeric,
    total_fiber numeric,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    business_id uuid NOT NULL,
    creator_id uuid,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: serving_sizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.serving_sizes (
    id uuid NOT NULL,
    name character varying(255),
    gram_weight numeric,
    ingredient_id uuid,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refresh_token character varying(255) NOT NULL,
    expires_at timestamp(0) without time zone NOT NULL,
    last_activity_at timestamp(0) without time zone NOT NULL,
    revoked_at timestamp(0) without time zone,
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status character varying(255) NOT NULL,
    started_at timestamp(0) without time zone NOT NULL,
    current_period_start timestamp(0) without time zone NOT NULL,
    current_period_end timestamp(0) without time zone NOT NULL,
    cancelled_at timestamp(0) without time zone,
    business_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL,
    trial_start timestamp(0) without time zone,
    trial_end timestamp(0) without time zone,
    trial_used boolean DEFAULT false NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(255) DEFAULT ''::character varying NOT NULL,
    last_name character varying(255) DEFAULT ''::character varying NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    email_verified_at timestamp(0) without time zone,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: coaches coaches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaches
    ADD CONSTRAINT coaches_pkey PRIMARY KEY (id);


--
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);


--
-- Name: meal_items meal_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_items
    ADD CONSTRAINT meal_items_pkey PRIMARY KEY (id);


--
-- Name: meals meals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals
    ADD CONSTRAINT meals_pkey PRIMARY KEY (id);


--
-- Name: measurement_units measurement_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurement_units
    ADD CONSTRAINT measurement_units_pkey PRIMARY KEY (id);


--
-- Name: nutrition_plans nutrition_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_plans
    ADD CONSTRAINT nutrition_plans_pkey PRIMARY KEY (id);


--
-- Name: one_time_codes one_time_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.one_time_codes
    ADD CONSTRAINT one_time_codes_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: recipe_ingredients recipe_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: serving_sizes serving_sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serving_sizes
    ADD CONSTRAINT serving_sizes_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: businesses_handle_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX businesses_handle_index ON public.businesses USING btree (handle);


--
-- Name: businesses_owner_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX businesses_owner_id_index ON public.businesses USING btree (owner_id);


--
-- Name: clients_business_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_business_id_index ON public.clients USING btree (business_id);


--
-- Name: clients_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_email_index ON public.clients USING btree (email);


--
-- Name: clients_user_business_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clients_user_business_index ON public.clients USING btree (user_id, business_id) WHERE (user_id IS NOT NULL);


--
-- Name: clients_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_user_id_index ON public.clients USING btree (user_id);


--
-- Name: coaches_business_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coaches_business_id_index ON public.coaches USING btree (business_id);


--
-- Name: coaches_user_id_business_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX coaches_user_id_business_id_index ON public.coaches USING btree (user_id, business_id);


--
-- Name: coaches_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coaches_user_id_index ON public.coaches USING btree (user_id);


--
-- Name: ingredients_business_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ingredients_business_id_index ON public.ingredients USING btree (business_id);


--
-- Name: ingredients_creator_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ingredients_creator_id_index ON public.ingredients USING btree (creator_id);


--
-- Name: meal_items_meal_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meal_items_meal_id_index ON public.meal_items USING btree (meal_id);


--
-- Name: meal_items_recipe_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meal_items_recipe_id_index ON public.meal_items USING btree (recipe_id);


--
-- Name: meal_recipe_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX meal_recipe_unique_idx ON public.meal_items USING btree (meal_id, recipe_id);


--
-- Name: meals_day_number_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meals_day_number_index ON public.meals USING btree (day_number);


--
-- Name: meals_daytime_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meals_daytime_index ON public.meals USING btree (daytime);


--
-- Name: meals_nutrition_plan_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meals_nutrition_plan_id_index ON public.meals USING btree (nutrition_plan_id);


--
-- Name: measurement_units_abbreviation_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX measurement_units_abbreviation_index ON public.measurement_units USING btree (abbreviation);


--
-- Name: measurement_units_name_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX measurement_units_name_index ON public.measurement_units USING btree (name);


--
-- Name: nutrition_plans_business_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_plans_business_id_index ON public.nutrition_plans USING btree (business_id);


--
-- Name: nutrition_plans_client_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_plans_client_id_index ON public.nutrition_plans USING btree (client_id);


--
-- Name: nutrition_plans_creator_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_plans_creator_id_index ON public.nutrition_plans USING btree (creator_id);


--
-- Name: nutrition_plans_original_plan_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_plans_original_plan_id_index ON public.nutrition_plans USING btree (original_plan_id);


--
-- Name: nutrition_plans_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_plans_status_index ON public.nutrition_plans USING btree (status);


--
-- Name: one_time_codes_user_id_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX one_time_codes_user_id_type_index ON public.one_time_codes USING btree (user_id, type);


--
-- Name: plans_slug_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plans_slug_index ON public.plans USING btree (slug);


--
-- Name: recipe_ingredients_ingredient_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recipe_ingredients_ingredient_id_index ON public.recipe_ingredients USING btree (ingredient_id);


--
-- Name: recipe_ingredients_recipe_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recipe_ingredients_recipe_id_index ON public.recipe_ingredients USING btree (recipe_id);


--
-- Name: recipe_ingredients_unit_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recipe_ingredients_unit_id_index ON public.recipe_ingredients USING btree (unit_id);


--
-- Name: recipes_business_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recipes_business_id_index ON public.recipes USING btree (business_id);


--
-- Name: recipes_creator_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recipes_creator_id_index ON public.recipes USING btree (creator_id);


--
-- Name: recipes_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recipes_status_index ON public.recipes USING btree (status);


--
-- Name: serving_sizes_ingredient_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX serving_sizes_ingredient_id_index ON public.serving_sizes USING btree (ingredient_id);


--
-- Name: sessions_refresh_token_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sessions_refresh_token_index ON public.sessions USING btree (refresh_token);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: subscriptions_business_active_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscriptions_business_active_index ON public.subscriptions USING btree (business_id) WHERE ((status)::text = 'active'::text);


--
-- Name: subscriptions_business_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_business_id_index ON public.subscriptions USING btree (business_id);


--
-- Name: subscriptions_business_id_trial_end_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_business_id_trial_end_index ON public.subscriptions USING btree (business_id, trial_end);


--
-- Name: users_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_index ON public.users USING btree (email);


--
-- Name: businesses businesses_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: clients clients_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: clients clients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: coaches coaches_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaches
    ADD CONSTRAINT coaches_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: coaches coaches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaches
    ADD CONSTRAINT coaches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ingredients ingredients_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: ingredients ingredients_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.coaches(id) ON DELETE SET NULL;


--
-- Name: meal_items meal_items_meal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_items
    ADD CONSTRAINT meal_items_meal_id_fkey FOREIGN KEY (meal_id) REFERENCES public.meals(id) ON DELETE CASCADE;


--
-- Name: meal_items meal_items_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_items
    ADD CONSTRAINT meal_items_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: meals meals_nutrition_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals
    ADD CONSTRAINT meals_nutrition_plan_id_fkey FOREIGN KEY (nutrition_plan_id) REFERENCES public.nutrition_plans(id) ON DELETE CASCADE;


--
-- Name: nutrition_plans nutrition_plans_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_plans
    ADD CONSTRAINT nutrition_plans_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: nutrition_plans nutrition_plans_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_plans
    ADD CONSTRAINT nutrition_plans_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: nutrition_plans nutrition_plans_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_plans
    ADD CONSTRAINT nutrition_plans_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.coaches(id) ON DELETE SET NULL;


--
-- Name: nutrition_plans nutrition_plans_original_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_plans
    ADD CONSTRAINT nutrition_plans_original_plan_id_fkey FOREIGN KEY (original_plan_id) REFERENCES public.nutrition_plans(id) ON DELETE SET NULL;


--
-- Name: one_time_codes one_time_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.one_time_codes
    ADD CONSTRAINT one_time_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: recipe_ingredients recipe_ingredients_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- Name: recipe_ingredients recipe_ingredients_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: recipe_ingredients recipe_ingredients_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.measurement_units(id) ON DELETE SET NULL;


--
-- Name: recipes recipes_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: recipes recipes_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.coaches(id) ON DELETE SET NULL;


--
-- Name: serving_sizes serving_sizes_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serving_sizes
    ADD CONSTRAINT serving_sizes_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- PostgreSQL database dump complete
--

INSERT INTO public."schema_migrations" (version) VALUES (20251106052345);
INSERT INTO public."schema_migrations" (version) VALUES (20251106052354);
INSERT INTO public."schema_migrations" (version) VALUES (20251106052710);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053323);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053324);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053326);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053328);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053329);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053330);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053331);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053332);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053333);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053334);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053335);
INSERT INTO public."schema_migrations" (version) VALUES (20251106053336);
INSERT INTO public."schema_migrations" (version) VALUES (20251117090000);
INSERT INTO public."schema_migrations" (version) VALUES (20251119000000);
INSERT INTO public."schema_migrations" (version) VALUES (20251123000000);
INSERT INTO public."schema_migrations" (version) VALUES (20251123020000);
INSERT INTO public."schema_migrations" (version) VALUES (20251123030000);
INSERT INTO public."schema_migrations" (version) VALUES (20251125113824);
INSERT INTO public."schema_migrations" (version) VALUES (20251125131657);
