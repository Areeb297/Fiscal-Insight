import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Department Projection Manager</h1>
          <p className="text-muted-foreground text-lg">
            Professional financial projection tool for department managers. Manage costs, margins, and client economics with precision.
          </p>
        </div>
        
        <div className="pt-4">
          <Link href="/sign-in">
            <Button size="lg" className="w-full font-semibold">
              Sign In to Continue
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
