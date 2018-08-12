#!/bin/bash

yarn remove @ournet/domain
yarn remove @ournet/quotes-domain

yarn link @ournet/domain
yarn link @ournet/quotes-domain

yarn test
