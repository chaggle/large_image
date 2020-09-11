FROM ubuntu:20.04

# This is mostly based on the Dockerfiles from themattrix/pyenv and
# themattrix/tox-base.  It has some added packages, most notably liblzma-dev,
# to work for more of our conditions, plus some convenience libraries like
# libldap2-dev, libsasl2-dev, fuse to facilitate girder-based testing.

LABEL maintainer="Kitware, Inc. <kitware@kitware.com>"

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=en_US.UTF-8 \
    PYENV_ROOT="/.pyenv" \
    PATH="/.pyenv/bin:/.pyenv/shims:$PATH" \
    GOSU_VERSION=1.10 \
    PYTHON_VERSIONS="3.7.9 2.7.18 3.5.9 3.6.12 3.8.6" \
    LOCAL_PYTHON_VERSION="3.7.9"
    # PYTHON_VERSIONS="2.7.18 3.5.9 3.6.12 3.7.9 3.8.6 pypy2.7-7.3.1 pypy3.5-7.0.0 pypy3.6-7.3.1"

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      bzip2 \
      ca-certificates \
      curl \
      dirmngr \
      fonts-dejavu \
      fuse \
      git \
      gpg-agent \
      libbz2-dev \
      libffi-dev \
      libldap2-dev \
      liblzma-dev \
      libmagic-dev \
      libncurses5-dev \
      libncursesw5-dev \
      libreadline-dev \
      libsasl2-dev \
      libsqlite3-dev \
      libssl-dev \
      libxml2-dev \
      libxmlsec1-dev \
      llvm \
      locales \
      make \
      software-properties-common \
      tk-dev \
      vim \
      wget \
      xz-utils \
      zlib1g-dev \
      && \
    localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8 && \
    curl -L https://github.com/pyenv/pyenv-installer/raw/master/bin/pyenv-installer | bash && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN pyenv update && \
    echo $PYTHON_VERSIONS | xargs -P `nproc` -n 1 pyenv install && \
    pyenv global $(pyenv versions --bare) && \
    find $PYENV_ROOT/versions -type d '(' -name '__pycache__' -o -name 'test' -o -name 'tests' ')' -exec rm -rfv '{}' + && \
    find $PYENV_ROOT/versions -type f '(' -name '*.py[co]' -o -name '*.exe' ')' -exec rm -fv '{}' + && \
    echo $PYTHON_VERSIONS | tr " " "\n" > $PYENV_ROOT/version

RUN groupadd -r tox --gid=999 && \
    useradd -m -r -g tox --uid=999 tox

# Install gosu to run tox as the "tox" user instead of as root.
# https://github.com/tianon/gosu#from-debian
RUN set -x && \
    dpkgArch="$(dpkg --print-architecture | awk -F- '{ print $NF }')" && \
    wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch" && \
    wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch.asc" && \
    export GNUPGHOME="$(mktemp -d)" && \
    gpg --keyserver ha.pool.sks-keyservers.net --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4 && \
    gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu && \
    rm -r "$GNUPGHOME" /usr/local/bin/gosu.asc && \
    chmod +x /usr/local/bin/gosu && \
    gosu nobody true

RUN pyenv local ${PYTHON_VERSIONS%% *} && \
    python -m pip install -U pip && \
    python -m pip install tox && \
    pyenv local --unset && \
    pyenv rehash

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
