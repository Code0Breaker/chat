export const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    //@ts-ignore
    const timeDifference = Math.floor((now - date) / 1000); // Calculate the time difference in seconds

    const minutes = Math.floor(timeDifference / 60); // Extract the number of minutes
    const hours = Math.floor(minutes / 60); // Extract the number of hours
    const days = Math.floor(hours / 24); // Extract the number of days
    const weeks = Math.floor(days / 7); // Extract the number of weeks

    let times;
    if (weeks > 0) {
      times = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (days > 0) {
      times = `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      times = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      times = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    return times
  }