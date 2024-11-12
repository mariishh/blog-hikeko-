import axios from "axios";

export const filterPaginationData = async ({ create_new_arr = false, state, data, page, countRoute = "/get-pagination-data", data_to_send = {} }) => {
    let obj;

    try {
        if (state != null && !create_new_arr) {
            obj = { ...state, results: [...state.results, ...data], page: page };
        } else {
            // Make sure to pass the correct modelName and any necessary filter
            const response = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + countRoute, { modelName: "Blog", filter: {} });
            const { totalDocs } = response.data;
            obj = { results: data, page: 1, totalDocs };
        }
    } catch (err) {
        console.error("Error fetching pagination data:", err);
        obj = { results: data, page: 1, totalDocs: 0 }; // Default to empty response if there's an error
    }

    return obj;
}
