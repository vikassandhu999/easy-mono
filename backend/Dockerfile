# Dockerfile for Easy Backend Elixir/Phoenix Application
# Multi-stage build for production deployment

# =============================================================================
# Stage 1: Build Stage
# =============================================================================
# Use a known working hexpm/elixir image
# Check available tags at: https://hub.docker.com/r/hexpm/elixir/tags
ARG BUILDER_IMAGE="hexpm/elixir:1.15.7-erlang-26.2.1-debian-bookworm-20231009-slim"
ARG RUNNER_IMAGE="debian:bookworm-slim"

FROM ${BUILDER_IMAGE} AS builder

# Install build dependencies
RUN apt-get update -y && apt-get install -y build-essential git \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

# Prepare build directory
WORKDIR /app

# Install hex + rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Set build ENV
ENV MIX_ENV="prod"

# Install mix dependencies
COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config

# Copy compile-time config files before we compile dependencies
# to ensure any relevant config is available
COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

# Copy priv and lib directories
COPY priv priv
COPY lib lib

# Compile the release
RUN mix compile

# Copy runtime config
COPY config/runtime.exs config/

# Copy rel directory if it exists (optional release configuration)
COPY rel rel

# Create the release
RUN mix release

# =============================================================================
# Stage 2: Runtime Stage
# =============================================================================
FROM ${RUNNER_IMAGE}

# Install runtime dependencies
RUN apt-get update -y && \
    apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates curl \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

# Set the locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR /app

# Create a non-root user for running the application
RUN groupadd --gid 1000 elixir && \
    useradd --uid 1000 --gid elixir --shell /bin/bash --create-home elixir

# Copy the release from builder stage
COPY --from=builder --chown=elixir:elixir /app/_build/prod/rel/easy ./

# Set user
USER elixir

# Set runtime ENV
ENV MIX_ENV="prod"
ENV PHX_SERVER="true"

# Expose the port the app runs on
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Start the application
CMD ["bin/easy", "start"]
