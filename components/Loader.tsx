import { LOADER_SIZE_CLASSES } from "@/lib/common-utils";

interface LoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

const Loader = ({ message = "Loading...", size = "md" }: LoaderProps) => {
  return (
    <div className="flex items-center h-screen justify-center min-h-screen bg-black">
      <div className="text-center">
        <div
          className={`animate-spin rounded-full border-b-2 border-pink-500 mx-auto mb-4 ${LOADER_SIZE_CLASSES[size]}`}
        ></div>
        <p className="text-white text-lg">{message}</p>
      </div>
    </div>
  );
};

export default Loader;