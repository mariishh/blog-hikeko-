import { getFullDay } from "../common/date";
import classNames from "classnames"; // Optional: You can use classNames to handle dynamic class names.

const AboutUser = ({ classname = "", bio, joinedAt }) => {

    // Ensure the className is always properly concatenated
    const containerClass = classNames("md:w-[90%] md:mt-7", classname);

    // Handle case when bio is empty, null, or undefined
    const bioContent = bio && bio.trim().length > 0 ? bio : "Nothing to read here";

    return (
        <div className={containerClass}>
            <p className="text-xl leading-7">{bioContent}</p>

            <div className="flex gap-x-7 gap-y-2 flex-wrap my-7 items-center text-dark-grey">
                {/* You can add social links or other components here if needed */}
            </div>

            {/* Add a space between "Joined on" and the formatted date */}
            <p className="text-xl leading-7 text-dark-grey">
                Joined on {getFullDay(joinedAt)}
            </p>
        </div>
    );
};

export default AboutUser;
