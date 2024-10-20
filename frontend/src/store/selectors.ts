import { ReduxRouterSelector } from "@lagunovsky/redux-react-router";

import { State } from './types';

/**
 * 
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export const routerSelector: ReduxRouterSelector<State> = (state) => state.navigator;
