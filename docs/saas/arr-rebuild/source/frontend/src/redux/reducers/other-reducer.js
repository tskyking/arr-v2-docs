import {
  LOADER_REQUEST,
  LOADER_SUCCESS,
} from "../../constants/other-constants";

export const loaderReducer = (state = {}, action) => {
  switch (action.type) {
    case LOADER_REQUEST:
      return { ...state, loading: true };

    case LOADER_SUCCESS:
      return { loading: false };
    default:
      return state;
  }
};
