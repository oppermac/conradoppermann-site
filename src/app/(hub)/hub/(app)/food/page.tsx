import { PageHeader } from "../../components/PageHeader";
import { Placeholder } from "../../components/Placeholder";

export const metadata = { title: "Food" };

export default function FoodPage() {
  return (
    <>
      <PageHeader title="Food" />
      <Placeholder phase={4} what="Meals by photo, calories and macros against your targets." />
    </>
  );
}
