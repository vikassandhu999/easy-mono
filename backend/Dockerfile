# Dockerfile for Fly.io deployment
ARG BUILDER_IMAGE="hexpm/elixir:1.15.7-erlang-26.2.1-debian-bookworm-20231009-slim"
ARG RUNNER_IMAGE="debian:bookworm-slim"

FROM ${BUILDER_IMAGE} AS builder

RUN apt-get update -y && apt-get install -y build-essential git \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

WORKDIR /app

RUN mix local.hex --force && \
    mix local.rebar --force

ENV MIX_ENV="prod"

COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config

COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

COPY priv priv
COPY lib lib

RUN mix compile

COPY config/runtime.exs config/

COPY rel rel

RUN mix release
FROM ${RUNNER_IMAGE}

RUN apt-get update -y && \
    apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates curl \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR /app

RUN groupadd --gid 1000 elixir && \
    useradd --uid 1000 --gid elixir --shell /bin/bash --create-home elixir

COPY --from=builder --chown=elixir:elixir /app/_build/prod/rel/easy ./

USER elixir

ENV MIX_ENV="prod"
ENV PHX_SERVER="true"

ENV ERL_FLAGS="+P 16384 +Q 4096 +e 1024 +t 500000 +S 1:1 +SDcpu 1:1 +sbwt none +sbwtdcpu none +sbwtdio none +A 4 +MBas aobf +MHas aobf +MBsmbcs 128 +MBlmbcs 256 +MHsmbcs 128 +MHlmbcs 256"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["bin/server"]
