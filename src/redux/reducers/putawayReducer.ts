import { SortationTask } from '../../types/sortation';
import { putawayCandidateKey } from '../../utils/putawayCandidate';
import {
  FETCH_PUTAWAY_FROM_ORDER_REQUEST_SUCCESS,
  GET_PUTAWAY_CANDIDATES_REQUEST_SUCCESS,
  GET_PUTAWAY_DETAILS_BY_CONTAINER_ID_REQUEST_SUCCESS,
  PUTAWAY_CANDIDATE_PUT_AWAY,
  SUBMIT_PUTAWAY_ITEM_BIN_LOCATION_SUCCESS
} from '../actions/putaways';

export interface State {
  putAway: any;
  putAwayItem: any;
  candidates: any;
  putawayTasks: SortationTask[];
  putAwayOverrides: { [key: string]: number };
}

const initialState: State = {
  putAway: null,
  putAwayItem: null,
  candidates: [],
  putawayTasks: [],
  putAwayOverrides: {}
};

function reducer(state = initialState, action: any) {
  switch (action.type) {
    case FETCH_PUTAWAY_FROM_ORDER_REQUEST_SUCCESS: {
      return {
        ...state,
        putAway: action.payload.data
      };
    }
    case PUTAWAY_CANDIDATE_PUT_AWAY: {
      const { key, remainingQuantity } = action.payload;
      return {
        ...state,
        putAwayOverrides: { ...state.putAwayOverrides, [key]: remainingQuantity }
      };
    }
    case GET_PUTAWAY_CANDIDATES_REQUEST_SUCCESS: {
      const candidates = action.payload || [];
      // Drop overrides the server has caught up with, so they cannot go stale
      const putAwayOverrides = { ...state.putAwayOverrides };
      Object.keys(putAwayOverrides).forEach((key) => {
        const match = candidates.find((candidate: any) => putawayCandidateKey(candidate) === key);
        if (!match || Number(match.quantity) <= putAwayOverrides[key]) {
          delete putAwayOverrides[key];
        }
      });
      return {
        ...state,
        candidates,
        putAwayOverrides
      };
    }
    case SUBMIT_PUTAWAY_ITEM_BIN_LOCATION_SUCCESS: {
      return {
        ...state,
        putAwayItem: action.payload
      };
    }
    case GET_PUTAWAY_DETAILS_BY_CONTAINER_ID_REQUEST_SUCCESS: {
      const allTasks = action.payload || [];
      const filteredTasks = allTasks.filter(
        (task: SortationTask) => task.status === 'IN_PROGRESS' || task.status === 'PENDING'
      );
      return {
        ...state,
        putawayTasks: filteredTasks
      };
    }
    default: {
      return state;
    }
  }
}

export default reducer;
