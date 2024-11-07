import axios from "axios";

export const filterPaginationData = async ({
  create_new_arr = false,
  state,
  data,
  page,
  countRoute,
  data_to_send = {}
}) => {
  let obj;

  try {
    // Check if we are using a previously existing state or need to create a new one
    if (state != null && !create_new_arr) {
      // Append the new data to the existing results and update the current page
      obj = { ...state, results: [...state.results, ...data], page: page };
    } else {
      // If there's no previous state, make a request to count the total documents
      const response = await axios.post(
        import.meta.env.VITE_SERVER_DOMAIN + countRoute,
        data_to_send
      );

      const { totalDocs } = response.data;

      // Create a new object with the fetched data, starting from page 1
      obj = { results: data, page: 1, totalDocs };
    }
  } catch (err) {
    console.error("Error fetching pagination data:", err.message);

    // Log more detailed information in case of errors
    if (err.response) {
      console.error("Response data:", err.response.data);
      console.error("Response status:", err.response.status);
      console.error("Response headers:", err.response.headers);
    } else {
      console.error("No response from the server", err);
    }

    // Fallback to an empty response when there's an error
    obj = { results: data, page: 1, totalDocs: 0 };
  }

  return obj;
};
