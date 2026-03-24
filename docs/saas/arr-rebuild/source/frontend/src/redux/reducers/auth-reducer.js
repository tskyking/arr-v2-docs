import {
  USER_REGISTER_REQUEST,
  USER_REGISTER_SUCCESS,
  USER_REGISTER_FAIL,
  USER_LOGIN_REQUEST,
  USER_LOGIN_SUCCESS,
  USER_LOGIN_FAIL,
  USER_DETAILS_REQUEST,
  USER_DETAILS_SUCCESS,
  USER_DETAILS_FAIL,
  USER_DETAILS_RESET,
  USER_UPDATE_PROFILE_REQUEST,
  USER_UPDATE_PROFILE_SUCCESS,
  USER_UPDATE_PROFILE_FAIL,
  USER_UPDATE_PROFILE_RESET,
  USER_PORTFOLIO_REQUEST,
  USER_PORTFOLIO_SUCCESS,
  USER_PORTFOLIO_FAIL,
  USER_PORTFOLIO_RESET,
  USER_LOGOUT,
  GET_CREATOR_PROFILE_JOBS_INPROGRESS_FAILURE,
  GET_CREATOR_PROFILE_JOBS_INPROGRESS_REQUEST,
  GET_CREATOR_PROFILE_JOBS_INPROGRESS_SUCCESS,
  GET_PROFILE_RATING_CREATOR_REQUEST,
  GET_PROFILE_RATING_CREATOR_SUCCESS,
  GET_PROFILE_RATING_CREATOR_FAIL,
  GET_PROFILE_RATING_CREATOR_RESET,
  GET_PROFILE_RATING_AGENCY_REQUEST,
  GET_PROFILE_RATING_AGENCY_SUCCESS,
  GET_PROFILE_RATING_AGENCY_FAIL,
  GET_PROFILE_RATING_AGENCY_RESET,
  MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_FAILURE,
  MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_REQUEST,
  MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_SUCCESS,
  MEMBER_PROFILE_MARKETER_JOBS_INPROGRESS_FAILURE,
  MEMBER_PROFILE_MARKETER_JOBS_INPROGRESS_REQUEST,
  MEMBER_PROFILE_MARKETER_JOBS_INPROGRESS_SUCCESS,
  MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_SUCCESS,
  MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_REQUEST,
  MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_FAILURE,
  CLEAR_CACHE_SUCCESS,
  CLEAR_CACHE_FAILURE,
  CLEAR_CACHE_REQUEST,
} from "../../constants/auth-constants";

export const Cacheupdate = (state = {}, action) => {
  switch (action.type) {
    case CLEAR_CACHE_REQUEST:
      return { loading: true };

    case CLEAR_CACHE_SUCCESS:
      return {
        loading: false,
        success: true,
        userData: action.payload,
        message: action.payload.message,
      };

    case CLEAR_CACHE_FAILURE:
      return { loading: false, error: action.payload };

    case USER_LOGOUT:
      return {};

    default:
      return state;
  }
};

export const userRegisterReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_REGISTER_REQUEST:
      return { loading: true };

    case USER_REGISTER_SUCCESS:
      return {
        loading: false,
        success: true,
        userData: action.payload,
        message: action.payload.message,
      };

    case USER_REGISTER_FAIL:
      return { loading: false, error: action.payload };

    case USER_LOGOUT:
      return {};

    default:
      return state;
  }
};

export const userLoginReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_LOGIN_REQUEST:
      return { loading: true };

    case USER_LOGIN_SUCCESS:
      return {
        loading: false,
        userData: action.payload,
        message: action.payload.message,
      };

    case USER_LOGIN_FAIL:
      return { loading: false, error: action.payload };

    case USER_LOGOUT:
      return {};

    default:
      return state;
  }
};

export const userDetailsReducer = (state = { user: {} }, action) => {
  switch (action.type) {
    case USER_DETAILS_REQUEST:
      return { ...state, loading: true };

    case USER_DETAILS_SUCCESS:
      return { loading: false, user: action.payload, successDetails: true };

    case USER_DETAILS_FAIL:
      return { loading: false, error: action.payload };

    case USER_DETAILS_RESET:
      return { user: {} };

    default:
      return state;
  }
};

export const UpdateProfileReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_UPDATE_PROFILE_REQUEST:
      return { loading: true };

    case USER_UPDATE_PROFILE_SUCCESS:
      return {
        loading: false,
        successUpdate: true,
        userData: action.payload,
      };

    case USER_UPDATE_PROFILE_FAIL:
      return { loading: false, error: action.payload };

    case USER_UPDATE_PROFILE_RESET:
      return {};

    default:
      return state;
  }
};

export const userPortfolioReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_PORTFOLIO_REQUEST:
      return { ...state, loading: true };

    case USER_PORTFOLIO_SUCCESS:
      return {
        loading: false,
        count: action.payload.count,
        next: action.payload.next,
        previous: action.payload.previous,
        portfolioDetails: action.payload.results,
        success: true,
      };

    case USER_PORTFOLIO_FAIL:
      return { loading: false, error: action.payload };

    case USER_PORTFOLIO_RESET:
      return {};

    default:
      return state;
  }
};

export const getCreatorProfileJobsInProgressReducer = (
  state = { getCreatorProfileJobs: [] },
  action
) => {
  switch (action.type) {
    case GET_CREATOR_PROFILE_JOBS_INPROGRESS_REQUEST:
      return { loading: true };
    case GET_CREATOR_PROFILE_JOBS_INPROGRESS_SUCCESS:
      return {
        loading: false,
        success: true,
        getCreatorProfileJobs: action.payload,
      };
    case GET_CREATOR_PROFILE_JOBS_INPROGRESS_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const memberApproverJobsInProgressReducer = (
  state = { memberApproverJobs: [] },
  action
) => {
  switch (action.type) {
    case MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_REQUEST:
      return { loading: true };
    case MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_SUCCESS:
      return {
        loading: false,
        success: true,
        memberApproverJobs: action.payload,
      };
    case MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const memberMarketerJobsInProgressReducer = (
  state = { memberMarketerJobs: [] },
  action
) => {
  switch (action.type) {
    case MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_REQUEST:
      return { loading: true };
    case MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_SUCCESS:
      return {
        loading: false,
        success: true,
        memberMarketerJobs: action.payload,
      };
    case MEMBER_PROFILE_APPROVER_JOBS_INPROGRESS_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const getMemberAdminProfileJobsInProgressReducer = (
  state = { getProfileJobs: [] },
  action
) => {
  switch (action.type) {
    case MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_REQUEST:
      return { loading: true };
    case MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_SUCCESS:
      return {
        loading: false,
        success: true,
        getProfileJobs: action.payload,
      };
    case MEMBER_PROFILE_ADMIN_JOBS_INPROGRESS_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const getAgencyRatingDetailsReducer = (
  state = { AgencyRatingDetails: [] },
  action
) => {
  switch (action.type) {
    case GET_PROFILE_RATING_AGENCY_REQUEST:
      return { loading: true };
    case GET_PROFILE_RATING_AGENCY_SUCCESS:
      return {
        loading: false,
        success: true,
        AgencyRatingDetails: action.payload,
      };
    case GET_PROFILE_RATING_AGENCY_FAIL:
      return { loading: false, error: action.payload };
    case GET_PROFILE_RATING_AGENCY_RESET:
      return { AgencyRatingDetails: [] };
    default:
      return state;
  }
};

export const getCreatorRatingDetailsReducer = (
  state = { CreatorRatingDetails: [] },
  action
) => {
  switch (action.type) {
    case GET_PROFILE_RATING_CREATOR_REQUEST:
      return { loading: true };
    case GET_PROFILE_RATING_CREATOR_SUCCESS:
      return {
        loading: false,
        success: true,
        CreatorRatingDetails: action.payload,
      };
    case GET_PROFILE_RATING_CREATOR_FAIL:
      return { loading: false, error: action.payload };
    case GET_PROFILE_RATING_CREATOR_RESET:
      return { CreatorRatingDetails: [] };
    default:
      return state;
  }
};
