import {
  JOB_LIST_REQUEST,
  JOB_LIST_SUCCESS,
  JOB_LIST_FAIL,
  JOB_DETAILS_REQUEST,
  JOB_DETAILS_SUCCESS,
  JOB_DETAILS_FAIL,
  JOB_DETAILS_RESET,
  DELETE_JOB_REQUEST,
  DELETE_JOB_SUCCESS,
  DELETE_JOB_FAIL,
  AGENCY_JOB_LIST_REQUEST,
  AGENCY_JOB_LIST_SUCCESS,
  AGENCY_JOB_LIST_FAIL,
  LATEST_JOB_DETAILS_REQUEST,
  LATEST_JOB_DETAILS_SUCCESS,
  LATEST_JOB_DETAILS_FAIL,
  RELATED_JOBS_REQUEST,
  RELATED_JOBS_SUCCESS,
  RELATED_JOBS_FAIL,
} from "../../constants/job-constants";

const initialState = {
  jobData: [],
  loading: null,
};

export const agencyJobReducer = (state = initialState, action) => {
  switch (action.type) {
    case AGENCY_JOB_LIST_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case AGENCY_JOB_LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        agencyJobData: action.payload,
        success: true,
      };
    case AGENCY_JOB_LIST_FAIL:
      return {
        ...state,
        loading: false,
        agencyJobData: null,
        error: action.payload,
      };
    default:
      return state;
  }
};

export const jobReducer = (state = { jobData: [] }, action) => {
  switch (action.type) {
    case JOB_LIST_REQUEST:
      return {
        loading: true,
      };
    case JOB_LIST_SUCCESS:
      return {
        loading: false,
        jobData: action.payload,
        // jobData: action.payload.results,
        // next: action.payload.next,
        // previous: action.payload.previous,
        success: true,
      };
    case JOB_LIST_FAIL:
      return {
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

export const jobDeleteReducer = (state = {}, action) => {
  switch (action.type) {
    case DELETE_JOB_REQUEST:
      return { loading: true };

    case DELETE_JOB_SUCCESS:
      return { loading: false, success: true };

    case DELETE_JOB_FAIL:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const jobDetailsReducer = (state = { jobDetails: {} }, action) => {
  switch (action.type) {
    case JOB_DETAILS_REQUEST:
      return { ...state, loading: true };

    case JOB_DETAILS_SUCCESS:
      return { loading: false, jobDetails: action.payload, success: true };

    case JOB_DETAILS_FAIL:
      return { loading: false, error: action.payload };

    case JOB_DETAILS_RESET:
      return { jobDetails: {} };

    default:
      return state;
  }
};

export const freshJobsListReducer = (state = { freshJob: {} }, action) => {
  switch (action.type) {
    case LATEST_JOB_DETAILS_REQUEST:
      return { ...state, loading: true };

    case LATEST_JOB_DETAILS_SUCCESS:
      return {
        loading: false,
        freshJob: action.payload.data,
        message: action.payload.message,
        success: true,
      };

    case LATEST_JOB_DETAILS_FAIL:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const relatedJobsReducer = (state = { relatedJobs: {} }, action) => {
  switch (action.type) {
    case RELATED_JOBS_REQUEST:
      return { ...state, loading: true };

    case RELATED_JOBS_SUCCESS:
      return {
        loading: false,
        relatedJobs: action.payload,
        // success: true,
      };

    case RELATED_JOBS_FAIL:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};
