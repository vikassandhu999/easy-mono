import PagePaper from "@/components/container/PagePaper";
import ProfileContent from "./ProfileContent";
import PaddingContainer from "@/components/container/PaddingContainer";

const ProfilePage = () => {
  return (
    <PagePaper>
      <PaddingContainer>
        <ProfileContent />
      </PaddingContainer>
    </PagePaper>
  );
};

export default ProfilePage;
