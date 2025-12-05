import Link from "next/link";
import { FaGithub } from "react-icons/fa";

export default function Footer() {
    return (
        <footer className="bg-secondary-light text-secondary-dark dark:bg-secondary-dark dark:text-secondary-hover py-4">
            <div className="flex justify-end pr-8">
              <Link
              href="https://github.com/Rindrics/mikazuki-munechika/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:underline cursor-pointer"
              >
              <span>View source code on GitHub</span>
              <FaGithub className="w-5 h-5" />
            </Link>
            </div>
        </footer>
    )
}