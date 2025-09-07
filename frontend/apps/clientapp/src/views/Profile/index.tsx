import PagePaper from "@/Components/Containers/PagePaper";
import ProfileContent from "./ProfileContent";
import PaddingContainer from "@/Components/Containers/PaddingContainer";

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
