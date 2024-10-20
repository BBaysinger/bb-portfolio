import { ReduxRouterSelector } from "@lagunovsky/redux-react-router";

import { State } from './types';

export const routerSelector: ReduxRouterSelector<State> = (state) => state.navigator;
