import { loadArticles, getAllCategories, getAllTags, Article } from "@/lib/articles";
import Dashboard from "./dashboard";

export default function Page() {
  const articles = loadArticles();
  const categories = getAllCategories(articles);
  const tags = getAllTags(articles);

  return <Dashboard articles={articles} categories={categories} tags={tags} />;
}
